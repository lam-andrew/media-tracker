import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { hashPassword, newToken, tokenHash } from "./auth.js";
import { BRAND, type User } from "../../../packages/contracts/src/index.js";
export async function sendAccountLink(
  pool: Pool,
  id: string,
  email: string,
  purpose: "reset" | "verify",
  origin: string,
) {
  if (!process.env.SMTP_HOST)
    throw Object.assign(new Error("Email delivery is not configured."), {
      statusCode: 503,
    });
  const token = newToken();
  await pool.query(
    "delete from account_tokens where user_id=$1 and purpose=$2",
    [id, purpose],
  );
  await pool.query(
    "insert into account_tokens(token_hash,user_id,purpose,expires_at) values($1,$2,$3,now()+interval '30 minutes')",
    [tokenHash(token), id, purpose],
  );
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `${BRAND.name}: ${purpose === "reset" ? "reset password" : "confirm email"}`,
    text: `Open this link within 30 minutes:\n${origin}/#${purpose}=${token}\nIf you did not request this, ignore this email.`,
  });
}
export async function authExtras(
  app: FastifyInstance,
  pool: Pool,
  user: (req: FastifyRequest) => Promise<User>,
  session: (id: string) => Promise<string>,
  cookieOptions: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  },
  options: { origin: string; registration: boolean },
) {
  for (const purpose of ["reset", "verify"] as const)
    app.post(
      "/api/auth/request-" + purpose,
      { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } },
      async (req) => {
        const { email } = z
          .object({
            email: z
              .email()
              .max(254)
              .transform((s) => s.toLowerCase()),
          })
          .parse(req.body);
        if (!process.env.SMTP_HOST)
          throw Object.assign(new Error("Email delivery is not configured."), {
            statusCode: 503,
          });
        const account = (
          await pool.query("select id,verified from accounts where email=$1", [
            email,
          ])
        ).rows[0];
        if (account && (purpose === "reset" || !account.verified))
          await sendAccountLink(
            pool,
            account.id,
            email,
            purpose,
            options.origin,
          );
        return {
          message: "If the account is eligible, an email is on its way.",
        };
      },
    );
  app.post(
    "/api/auth/complete",
    { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const b = z
        .object({
          purpose: z.enum(["reset", "verify"]),
          token: z.string().min(30).max(100),
          password: z.string().min(12).max(128).optional(),
        })
        .parse(req.body);
      if (b.purpose === "reset" && !b.password)
        return reply.code(400).send({ error: "A new password is required." });
      const hash = b.password ? await hashPassword(b.password) : null;
      const client = await pool.connect();
      try {
        await client.query("begin");
        const found = await client.query(
          "delete from account_tokens where token_hash=$1 and purpose=$2 and expires_at>now() returning user_id",
          [tokenHash(b.token), b.purpose],
        );
        if (!found.rows[0]) {
          await client.query("rollback");
          return reply
            .code(400)
            .send({ error: "This link has expired or was already used." });
        }
        const id = found.rows[0].user_id;
        if (b.purpose === "reset") {
          await client.query(
            "update accounts set password_hash=$1,verified=true where id=$2",
            [hash, id],
          );
          await client.query("delete from sessions where user_id=$1", [id]);
        } else
          await client.query("update accounts set verified=true where id=$1", [
            id,
          ]);
        await client.query("delete from account_tokens where user_id=$1", [id]);
        await client.query("commit");
        return { message: "Account updated. You can sign in now." };
      } catch (e) {
        await client.query("rollback");
        throw e;
      } finally {
        client.release();
      }
    },
  );
  app.get("/api/auth/google", async (req, reply) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
      return reply
        .code(503)
        .send({ error: "Google sign-in is not configured." });
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      options.origin + "/api/auth/google/callback",
    );
    const state = newToken();
    const { codeVerifier, codeChallenge } =
      await client.generateCodeVerifierAsync();
    reply.setCookie("oauth_state", state, { ...cookieOptions, maxAge: 600 });
    reply.setCookie("oauth_verifier", codeVerifier, {
      ...cookieOptions,
      maxAge: 600,
    });
    return reply.redirect(
      client.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        state,
        code_challenge: codeChallenge,
        code_challenge_method: "S256" as never,
      }),
    );
  });
  app.get("/api/auth/google/callback", async (req, reply) => {
    const q = z
      .object({ code: z.string().max(4096), state: z.string().max(100) })
      .safeParse(req.query);
    const state = req.cookies.oauth_state,
      verifier = req.cookies.oauth_verifier;
    reply.clearCookie("oauth_state", { path: "/" });
    reply.clearCookie("oauth_verifier", { path: "/" });
    if (!q.success || !state || q.data.state !== state || !verifier)
      return reply.redirect("/#auth-error=Google%20sign-in%20expired");
    try {
      const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        options.origin + "/api/auth/google/callback",
      );
      const { tokens } = await client.getToken({
        code: q.data.code,
        codeVerifier: verifier,
      });
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const p = ticket.getPayload();
      if (!p?.email_verified || !p.email || !p.sub)
        throw new Error("Unverified identity");
      let account = (
        await pool.query(
          "select id,google_id,verified from accounts where google_id=$1 or email=$2",
          [p.sub, p.email.toLowerCase()],
        )
      ).rows[0];
      if (account && account.google_id !== p.sub) {
        if (!account.verified || account.google_id)
          throw new Error("Confirm existing account first");
        await pool.query("update accounts set google_id=$1 where id=$2", [
          p.sub,
          account.id,
        ]);
      }
      if (!account) {
        if (!options.registration) throw new Error("Registration closed");
        account = { id: randomUUID() };
        await pool.query(
          "insert into accounts(id,email,password_hash,google_id,verified,display_name) values($1,$2,$3,$4,true,$5)",
          [
            account.id,
            p.email.toLowerCase(),
            await hashPassword(newToken()),
            p.sub,
            p.name ?? "",
          ],
        );
      }
      reply.setCookie(
        "marqd_session",
        await session(account.id),
        cookieOptions,
      );
      return reply.redirect("/");
    } catch {
      return reply.redirect(
        "/#auth-error=Google%20sign-in%20failed.%20Confirm%20your%20existing%20email%20or%20contact%20the%20administrator.",
      );
    }
  });
}
