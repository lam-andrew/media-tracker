import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  credentialsSchema,
  trackingSchema,
  type User,
  mediaConfig,
} from "../../../packages/contracts/src/index.js";
import { hashPassword, verifyPassword, newToken, tokenHash } from "./auth.js";
import { type Provider } from "./providers.js";
import { catalog, rank, getMedia, type CatalogProvider } from "./catalog.js";
import { features, libraryRow } from "./features.js";
import { authExtras, sendAccountLink } from "./auth-extras.js";
const fail = (statusCode: number, message: string) =>
  Object.assign(new Error(message), { statusCode });
export async function buildServer(
  pool: Pool,
  options: {
    origin: string;
    secure: boolean;
    registration: boolean;
    provider?: Provider;
    logger?: boolean;
  },
) {
  const app = Fastify({
    logger: options.logger
      ? {
          serializers: {
            req: (r) => ({ method: r.method, url: r.url?.split("?")[0] }),
          },
        }
      : false,
    trustProxy: (_address, hop) => hop === 0,
    bodyLimit: 32768,
    requestTimeout: 15000,
  });
  const providers: Record<string, CatalogProvider> = {
    ...catalog,
    ...(options.provider ? { book: options.provider } : {}),
  };
  const typeSchema = z.enum(["book", "movie", "tv", "game"]).default("book");
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin !== options.origin
    )
      throw fail(403, "Request origin is not allowed.");
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof z.ZodError)
      return reply.code(400).send({ error: error.issues[0].message });
    const e = error as Error & { statusCode?: number };
    const status = e.statusCode ?? 500;
    if (status >= 500) req.log.error({ message: e.message }, "Request failed");
    reply.code(status).send({
      error:
        status === 500 ? "Something went wrong. Please try again." : e.message,
    });
  });
  async function user(req: {
    cookies: Record<string, string | undefined>;
  }): Promise<User> {
    const token = req.cookies.marqd_session;
    if (!token) throw fail(401, "Please sign in.");
    const result = await pool.query(
      "select a.id,a.email from sessions s join accounts a on a.id=s.user_id where s.token_hash=$1 and s.expires_at>now()",
      [tokenHash(token)],
    );
    if (!result.rows[0]) throw fail(401, "Please sign in again.");
    return result.rows[0];
  }
  async function session(userId: string) {
    const token = newToken();
    await pool.query("delete from sessions where expires_at<now()");
    await pool.query(
      "insert into sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",
      [tokenHash(token), userId],
    );
    return token;
  }
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: options.secure,
    path: "/",
    maxAge: 604800,
  };
  app.get("/api/health", async () => {
    await pool.query("select 1");
    return { status: "ok" };
  });
  app.get("/api/session", async (req) => ({ user: await user(req) }));
  app.post(
    "/api/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      if (!options.registration)
        throw fail(403, "Registration is currently closed.");
      const body = credentialsSchema.parse(req.body);
      const id = randomUUID();
      const passwordHash = await hashPassword(body.password);
      try {
        await pool.query(
          "insert into accounts(id,email,password_hash) values($1,$2,$3)",
          [id, body.email, passwordHash],
        );
      } catch (e) {
        if ((e as { code: string }).code === "23505")
          throw fail(409, "Unable to create this account. Try signing in.");
        throw e;
      }
      if (process.env.REQUIRE_EMAIL_CONFIRMATION === "true") {
        await sendAccountLink(pool, id, body.email, "verify", options.origin);
        return { message: "Check your email to confirm your account." };
      }
      reply.setCookie("marqd_session", await session(id), cookieOptions);
      return { user: { id, email: body.email } };
    },
  );
  const dummyHash = await hashPassword(newToken());
  app.post(
    "/api/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = credentialsSchema.parse(req.body);
      const found = await pool.query(
        "select id,email,password_hash,verified from accounts where email=$1",
        [body.email],
      );
      const account = found.rows[0];
      const valid = await verifyPassword(
        body.password,
        account?.password_hash ?? dummyHash,
      );
      if (!account || !valid)
        throw fail(401, "Email or password is incorrect.");
      if (
        process.env.REQUIRE_EMAIL_CONFIRMATION === "true" &&
        !account.verified
      )
        throw fail(403, "Confirm your email before signing in.");
      if (req.cookies.marqd_session)
        await pool.query("delete from sessions where token_hash=$1", [
          tokenHash(req.cookies.marqd_session),
        ]);
      reply.setCookie(
        "marqd_session",
        await session(account.id),
        cookieOptions,
      );
      return { user: { id: account.id, email: account.email } };
    },
  );
  app.post("/api/logout", async (req, reply) => {
    if (req.cookies.marqd_session)
      await pool.query("delete from sessions where token_hash=$1", [
        tokenHash(req.cookies.marqd_session),
      ]);
    reply.clearCookie("marqd_session", { path: "/" });
    return { ok: true };
  });
  app.get(
    "/api/search",
    { config: { rateLimit: { max: 120, timeWindow: "1 minute" } } },
    async (req) => {
      await user(req);
      const { q, type, creator } = z
        .object({
          q: z.string().trim().min(2).max(150),
          type: typeSchema,
          creator: z.string().optional(),
        })
        .parse(req.query);
      const p = providers[type];
      return rank(
        creator && "byCreator" in p && p.byCreator
          ? await p.byCreator(q)
          : await p.search(q),
        q,
      );
    },
  );
  app.get("/api/media", async (req) => {
    const owner = await user(req);
    const { id, type, source } = z
      .object({
        id: z.string().max(80),
        type: typeSchema,
        source: z.string().optional(),
      })
      .parse(req.query);
    const media = await (options.provider
      ? providers[type].get(id)
      : getMedia(type, id, source));
    await pool.query(
      "update library set media=$1 where user_id=$2 and media_type=$3 and source=$4 and external_id=$5",
      [media, owner.id, type, media.source, id],
    );
    return media;
  });
  const row = libraryRow;
  app.get("/api/library", async (req) => {
    const owner = await user(req);
    const result = await pool.query(
      "select * from library where user_id=$1 order by created_at desc",
      [owner.id],
    );
    return result.rows.map(row);
  });
  app.post("/api/library", async (req, reply) => {
    const owner = await user(req);
    const body = z
      .object({
        source: z.string(),
        type: typeSchema,
        externalId: z.string().min(1).max(80),
        status: z.enum(["backlog", "in_progress", "completed", "abandoned"]),
      })
      .parse(req.body);
    if (
      body.source !== mediaConfig[body.type].source &&
      !(body.type === "book" && body.source === "googlebooks")
    )
      throw fail(400, "Source does not match media type");
    const media = options.provider
      ? await providers[body.type].get(body.externalId)
      : await getMedia(body.type, body.externalId, body.source);
    const total =
      typeof media.metadata[mediaConfig[media.type].totalKey] === "number" &&
      Number(media.metadata[mediaConfig[media.type].totalKey]) > 0
        ? Math.round(Number(media.metadata[mediaConfig[media.type].totalKey]))
        : null;
    const tracking = {
      status: body.status,
      rating: null,
      favorite: false,
      current: body.status === "completed" && total ? total : 0,
      total,
      notes: "",
      finishedAt:
        body.status === "completed"
          ? new Date().toISOString().slice(0, 10)
          : null,
    };
    const result = await pool.query(
      "insert into library(id,user_id,source,external_id,media_type,media,tracking) values($1,$2,$3,$4,$5,$6,$7) on conflict(user_id,media_type,source,external_id) do update set external_id=excluded.external_id returning *",
      [
        randomUUID(),
        owner.id,
        media.source,
        media.externalId,
        media.type,
        media,
        tracking,
      ],
    );
    reply.code(201);
    return row(result.rows[0]);
  });
  app.patch("/api/library/:id", async (req) => {
    const owner = await user(req);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const body = z
      .object({
        version: z.number().int().positive(),
        tracking: trackingSchema,
      })
      .parse(req.body);
    const result = await pool.query(
      "update library set tracking=$1,version=version+1,updated_at=now() where id=$2 and user_id=$3 and version=$4 returning *",
      [body.tracking, id, owner.id, body.version],
    );
    if (!result.rows[0]) {
      const exists = await pool.query(
        "select id from library where id=$1 and user_id=$2",
        [id, owner.id],
      );
      throw fail(
        exists.rowCount ? 409 : 404,
        exists.rowCount
          ? "This item changed elsewhere. Reload and try again."
          : "Item not found.",
      );
    }
    return row(result.rows[0]);
  });
  await features(app, pool, user, providers);
  await authExtras(app, pool, user, session, cookieOptions, options);
  return app;
}
