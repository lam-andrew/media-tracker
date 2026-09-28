import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  catalog,
  providerAvailability,
  similar,
  type CatalogProvider,
} from "./catalog.js";
import {
  entrySchema,
  mediaKey,
  type Media,
  type LibraryItem,
  type User,
} from "../../../packages/contracts/src/index.js";
import { verifyPassword } from "./auth.js";
export const libraryRow = (r: Record<string, unknown>): LibraryItem => ({
  ...(r.media as Media),
  id: String(r.id),
  version: Number(r.version),
  tracking: r.tracking as LibraryItem["tracking"],
  createdAt: new Date(r.created_at as string).toISOString(),
});
export async function features(
  app: FastifyInstance,
  pool: Pool,
  user: (req: FastifyRequest) => Promise<User>,
  providers: Record<string, CatalogProvider> = catalog,
) {
  app.get("/api/config", async () => ({
    providers: providerAvailability(),
    google: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    email: !!process.env.SMTP_HOST,
    registration: process.env.ALLOW_REGISTRATION === "true",
  }));
  app.delete("/api/library/:id", async (req) => {
    const owner = await user(req);
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    await pool.query("delete from library where user_id=$1 and id=$2", [
      owner.id,
      id,
    ]);
    return { ok: true };
  });
  app.get("/api/profile", async (req) => {
    const owner = await user(req);
    return (
      await pool.query(
        'select email,display_name as "displayName",verified from accounts where id=$1',
        [owner.id],
      )
    ).rows[0];
  });
  app.patch("/api/profile", async (req) => {
    const owner = await user(req);
    const { displayName } = z
      .object({ displayName: z.string().trim().max(100) })
      .parse(req.body);
    await pool.query("update accounts set display_name=$1 where id=$2", [
      displayName,
      owner.id,
    ]);
    return { ok: true };
  });
  app.delete("/api/account", async (req, reply) => {
    const owner = await user(req);
    const { password, confirmation } = z
      .object({
        password: z.string().max(128),
        confirmation: z.literal("DELETE"),
      })
      .parse(req.body);
    const a = (
      await pool.query("select password_hash from accounts where id=$1", [
        owner.id,
      ])
    ).rows[0];
    if (
      confirmation !== "DELETE" ||
      !(await verifyPassword(password, a.password_hash))
    )
      return reply.code(401).send({
        error:
          "Enter your password to delete your account. Google accounts can set a password using recovery first.",
      });
    await pool.query("delete from accounts where id=$1", [owner.id]);
    reply.clearCookie("marqd_session", { path: "/" });
    return { ok: true };
  });
  app.get("/api/goals", async (req) => {
    const owner = await user(req);
    return (
      await pool.query(
        "select year,media_type as type,target from goals where user_id=$1 order by year desc,media_type",
        [owner.id],
      )
    ).rows;
  });
  app.put("/api/goals", async (req) => {
    const owner = await user(req);
    const b = z
      .object({
        year: z.number().int().min(1900).max(2200),
        type: z.enum(["all", "book", "movie", "tv", "game"]),
        target: z.number().int().min(1).max(100000),
      })
      .parse(req.body);
    await pool.query(
      "insert into goals(user_id,year,media_type,target) values($1,$2,$3,$4) on conflict(user_id,year,media_type) do update set target=excluded.target",
      [owner.id, b.year, b.type, b.target],
    );
    return { ok: true };
  });
  app.delete("/api/goals", async (req) => {
    const owner = await user(req);
    const b = z
      .object({ year: z.number().int(), type: z.string() })
      .parse(req.body);
    await pool.query(
      "delete from goals where user_id=$1 and year=$2 and media_type=$3",
      [owner.id, b.year, b.type],
    );
    return { ok: true };
  });
  app.get("/api/export", async (req, reply) => {
    const owner = await user(req);
    const rows = (
      await pool.query(
        "select * from library where user_id=$1 order by created_at",
        [owner.id],
      )
    ).rows;
    const goals = (
      await pool.query(
        "select year,media_type as type,target from goals where user_id=$1",
        [owner.id],
      )
    ).rows;
    reply.header(
      "Content-Disposition",
      'attachment; filename="marqd-library.json"',
    );
    return {
      format: "marqd-v2",
      version: 1,
      entries: rows.map((r) => {
        const {
          id: _id,
          version: _v,
          tracking,
          createdAt,
          ...media
        } = libraryRow(r);
        void _id;
        void _v;
        return { media, tracking, createdAt };
      }),
      goals,
    };
  });
  app.post("/api/import", { bodyLimit: 2 * 1024 * 1024 }, async (req) => {
    const owner = await user(req);
    const b = z
      .object({
        entries: z.array(entrySchema).max(200),
        goals: z
          .array(
            z.object({
              year: z.number().int().min(1900).max(2200),
              type: z.enum(["all", "book", "movie", "tv", "game"]),
              target: z.number().int().positive().max(100000),
            }),
          )
          .max(100)
          .optional(),
      })
      .parse(req.body);
    const client = await pool.connect();
    let added = 0;
    try {
      await client.query("begin");
      for (const e of b.entries) {
        const r = await client.query(
          "insert into library(id,user_id,source,external_id,media_type,media,tracking,created_at) values($1,$2,$3,$4,$5,$6,$7,coalesce($8::timestamptz,now())) on conflict(user_id,media_type,source,external_id) do nothing",
          [
            randomUUID(),
            owner.id,
            e.media.source,
            e.media.externalId,
            e.media.type,
            e.media,
            e.tracking,
            e.createdAt ?? null,
          ],
        );
        added += r.rowCount ?? 0;
      }
      for (const g of b.goals ?? [])
        await client.query(
          "insert into goals(user_id,year,media_type,target) values($1,$2,$3,$4) on conflict do nothing",
          [owner.id, g.year, g.type, g.target],
        );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
    return { added, skipped: b.entries.length - added };
  });
  app.get("/api/discover", async (req) => {
    const owner = await user(req);
    const items = (
      await pool.query(
        "select * from library where user_id=$1 order by updated_at desc",
        [owner.id],
      )
    ).rows.map(libraryRow);
    const owned = new Set(items.map(mediaKey));
    const seeds = items
      .filter(
        (m) =>
          m.tracking.favorite ||
          (m.tracking.rating ?? 0) >= 4 ||
          m.tracking.status === "completed",
      )
      .slice(0, 4);
    const inputs = seeds.length
      ? seeds
      : [
          {
            type: "book",
            title: "Popular reads",
            creators: ["Ursula K. Le Guin"],
          },
        ];
    const rows = await Promise.all(
      inputs.map(async (seed) => {
        try {
          const p = providers[seed.type];
          const query = seed.creators[0] || seed.title;
          const found = seeds.length
            ? await similar(seed as Media)
            : seed.creators[0] && p.byCreator
              ? await p.byCreator(query)
              : await p.search(query);
          return {
            reason: seeds.length
              ? `Because you loved ${seed.title}`
              : "A place to begin",
            items: found.filter((m) => !owned.has(mediaKey(m))).slice(0, 8),
          };
        } catch {
          return {
            reason: `Suggestions for ${seed.title} are temporarily unavailable`,
            items: [],
          };
        }
      }),
    );
    return rows;
  });
}
