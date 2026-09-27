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
} from "../../../packages/contracts/src/index.js";
import { hashPassword, verifyPassword, newToken, tokenHash } from "./auth.js";
import { providers, type Provider } from "./providers.js";
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
    logger: options.logger ?? false,
    bodyLimit: 32768,
    requestTimeout: 15000,
  });
  const bookProvider = options.provider ?? providers.openlibrary;
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
        "select id,email,password_hash from accounts where email=$1",
        [body.email],
      );
      const account = found.rows[0];
      const valid = await verifyPassword(
        body.password,
        account?.password_hash ?? dummyHash,
      );
      if (!account || !valid)
        throw fail(401, "Email or password is incorrect.");
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
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (req) => {
      await user(req);
      const { q } = z
        .object({ q: z.string().trim().min(2).max(150) })
        .parse(req.query);
      return bookProvider.search(q);
    },
  );
  app.get("/api/media", async (req) => {
    await user(req);
    const { id } = z.object({ id: z.string().max(80) }).parse(req.query);
    return bookProvider.get(id);
  });
  const row = (r: Record<string, unknown>) => ({
    ...(r.media as object),
    id: r.id,
    version: r.version,
    tracking: r.tracking,
  });
  app.get("/api/library", async (req) => {
    const owner = await user(req);
    const result = await pool.query(
      "select id,media,tracking,version from library where user_id=$1 order by created_at desc",
      [owner.id],
    );
    return result.rows.map(row);
  });
  app.post("/api/library", async (req, reply) => {
    const owner = await user(req);
    const body = z
      .object({
        source: z.literal("openlibrary"),
        externalId: z.string().regex(/^\/works\/OL\d+W$/),
        status: z.enum(["backlog", "in_progress", "completed", "abandoned"]),
      })
      .parse(req.body);
    const media = await bookProvider.get(body.externalId);
    const total =
      typeof media.metadata.pages === "number" && media.metadata.pages > 0
        ? Math.round(media.metadata.pages)
        : null;
    const tracking = {
      status: body.status,
      rating: null,
      favorite: false,
      current: body.status === "completed" && total ? total : 0,
      total,
      notes: "",
    };
    const result = await pool.query(
      "insert into library(id,user_id,source,external_id,media_type,media,tracking) values($1,$2,$3,$4,$5,$6,$7) on conflict(user_id,source,external_id) do update set external_id=excluded.external_id returning id,media,tracking,version",
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
      "update library set tracking=$1,version=version+1,updated_at=now() where id=$2 and user_id=$3 and version=$4 returning id,media,tracking,version",
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
  return app;
}
