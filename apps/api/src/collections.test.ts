import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import Fastify, { type FastifyRequest } from "fastify";
import { Pool } from "pg";
import { z } from "zod";
import {
  collections,
  exportCollections,
  importCollections,
} from "./collections.js";
import { migrate } from "./migrate.js";
import { buildServer } from "./server.js";
import type { Collection } from "./collections.js";
import {
  mediaKey,
  type LibraryItem,
  type Tracking,
} from "../../../packages/contracts/src/index.js";

const owner = {
  id: randomUUID(),
  email: `collections-${randomUUID()}@example.invalid`,
};
const other = {
  id: randomUUID(),
  email: `collections-${randomUUID()}@example.invalid`,
};
const base = "/api/collections";
const paths = (id: string, item: string) => [
  { method: "GET" as const, url: base },
  { method: "POST" as const, url: base, payload: { name: "Shelf" } },
  {
    method: "PATCH" as const,
    url: `${base}/${id}`,
    payload: { name: "Renamed" },
  },
  { method: "DELETE" as const, url: `${base}/${id}` },
  { method: "PUT" as const, url: `${base}/${id}/items/${item}` },
  { method: "DELETE" as const, url: `${base}/${id}/items/${item}` },
];
async function harness(pool: Pool) {
  const app = Fastify();
  app.setErrorHandler((error, _req, reply) => {
    const e = error as Error & { statusCode?: number };
    reply
      .code(error instanceof z.ZodError ? 400 : (e.statusCode ?? 500))
      .send({ error: e.message });
  });
  await collections(app, pool, async (req: FastifyRequest) => {
    const token = req.headers.authorization;
    if (token === owner.id) return owner;
    if (token === other.id) return other;
    throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
  });
  return app;
}

test("every collections route authenticates before validation or database access", async () => {
  const app = await harness({
    query() {
      throw new Error("Unexpected database access");
    },
  } as unknown as Pool);
  try {
    for (const request of paths("invalid", "invalid"))
      assert.equal((await app.inject(request)).statusCode, 401);
  } finally {
    await app.close();
  }
});

test("collections validate trimmed names and both UUID parameters before database access", async () => {
  const app = await harness({
    query() {
      throw new Error("Unexpected database access");
    },
  } as unknown as Pool);
  const headers = { authorization: owner.id };
  try {
    for (const name of ["", " \n\t ", "x".repeat(81), 123, null]) {
      for (const method of ["POST", "PATCH"] as const)
        assert.equal(
          (
            await app.inject({
              method,
              url: method === "POST" ? base : `${base}/${randomUUID()}`,
              headers,
              payload: { name },
            })
          ).statusCode,
          400,
        );
    }
    for (const request of paths("invalid", "invalid").slice(2))
      assert.equal((await app.inject({ ...request, headers })).statusCode, 400);
    for (const method of ["PUT", "DELETE"] as const)
      assert.equal(
        (
          await app.inject({
            method,
            url: `${base}/${randomUUID()}/items/invalid`,
            headers,
          })
        ).statusCode,
        400,
      );
  } finally {
    await app.close();
  }
});

test(
  "collections database ownership, lifecycle, concurrency and portable imports",
  { skip: !process.env.TEST_DATABASE_URL },
  async (t) => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const app = await harness(pool);
    const ownItem = randomUUID(),
      foreignItem = randomUUID();
    const request = (
      method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
      url: string,
      payload?: unknown,
      userId = owner.id,
    ) =>
      app.inject({ method, url, payload, headers: { authorization: userId } });
    const list = async (userId = owner.id) =>
      (await request("GET", base, undefined, userId)).json();
    const create = async (name: string, userId = owner.id) => {
      const response = await request("POST", base, { name }, userId);
      assert.equal(response.statusCode, 200, response.body);
      return response.json().id as string;
    };
    try {
      await migrate(pool);
      await migrate(pool);
      for (const account of [owner, other])
        await pool.query(
          "insert into accounts(id,email,password_hash) values($1,$2,'unused')",
          [account.id, account.email],
        );
      for (const [id, userId] of [
        [ownItem, owner.id],
        [foreignItem, other.id],
      ])
        await pool.query(
          "insert into library(id,user_id,source,external_id,media_type,media,tracking) values($1,$2,'tmdb','42','movie','{}','{}')",
          [id, userId],
        );
      const id = await create("  Favorites  ");
      const member = `${base}/${id}/items/${ownItem}`;

      await t.test(
        "create/list/rename are scoped, trimmed and reject duplicate names",
        async () => {
          assert.deepEqual(await list(), [
            { id, name: "Favorites", itemIds: [] },
          ]);
          assert.deepEqual(await list(other.id), []);
          assert.equal(
            (await request("POST", base, { name: "Favorites" })).statusCode,
            409,
          );
          assert.equal(
            (await request("PATCH", `${base}/${id}`, { name: "  Watch  " }))
              .statusCode,
            200,
          );
          assert.equal((await list())[0].name, "Watch");
          const second = await create("Other");
          assert.equal(
            (await request("PATCH", `${base}/${second}`, { name: "Watch" }))
              .statusCode,
            409,
          );
          assert.equal(
            (await request("DELETE", `${base}/${second}`)).statusCode,
            200,
          );
          const boundary = await create(" " + "x".repeat(80) + " ");
          await request("DELETE", `${base}/${boundary}`);
        },
      );
      await t.test(
        "foreign and missing collection writes and foreign library membership are rejected",
        async () => {
          for (const route of paths(id, ownItem).slice(2))
            assert.equal(
              (
                await request(
                  route.method,
                  route.url,
                  "payload" in route ? route.payload : undefined,
                  other.id,
                )
              ).statusCode,
              404,
            );
          for (const route of paths(randomUUID(), ownItem).slice(2))
            assert.equal(
              (
                await request(
                  route.method,
                  route.url,
                  "payload" in route ? route.payload : undefined,
                )
              ).statusCode,
              404,
            );
          for (const method of ["PUT", "DELETE"] as const) {
            assert.equal(
              (await request(method, `${base}/${id}/items/${foreignItem}`))
                .statusCode,
              404,
            );
            assert.equal(
              (await request(method, `${base}/${id}/items/${randomUUID()}`))
                .statusCode,
              404,
            );
          }
          assert.deepEqual(await list(), [{ id, name: "Watch", itemIds: [] }]);
        },
      );
      await t.test(
        "membership addition and removal are idempotent, including simultaneous additions",
        async () => {
          const responses = await Promise.all(
            Array.from({ length: 8 }, () => request("PUT", member)),
          );
          for (const response of responses)
            assert.equal(response.statusCode, 200, response.body);
          assert.deepEqual((await list())[0].itemIds, [ownItem]);
          for (let i = 0; i < 2; i++)
            assert.equal((await request("DELETE", member)).statusCode, 200);
          assert.deepEqual((await list())[0].itemIds, []);
          await request("PUT", member);
        },
      );
      await t.test(
        "relational constraints reject foreign ownership even without API guards",
        async () => {
          await assert.rejects(
            pool.query(
              "insert into collection_memberships(user_id,collection_id,item_id) values($1,$2,$3)",
              [owner.id, id, foreignItem],
            ),
            { code: "23503" },
          );
          await assert.rejects(
            pool.query(
              "insert into collection_memberships(user_id,collection_id,item_id) values($1,$2,$3)",
              [other.id, id, foreignItem],
            ),
            { code: "23503" },
          );
        },
      );
      await t.test(
        "portable helpers merge by name and owner-scoped media identity across accounts",
        async () => {
          const portable = await exportCollections(pool, owner.id);
          assert.deepEqual(portable, [
            {
              name: "Watch",
              items: [{ type: "movie", source: "tmdb", externalId: "42" }],
            },
          ]);
          assert.deepEqual(await exportCollections(pool, other.id), []);
          const client = await pool.connect();
          try {
            await client.query("begin");
            for (let i = 0; i < 2; i++)
              assert.equal(
                await importCollections(client, other.id, [
                  ...portable,
                  {
                    name: "Empty",
                    items: [{ type: "tv", source: "tmdb", externalId: "42" }],
                  },
                ]),
                2,
              );
            await client.query("commit");
            const imported = await list(other.id);
            assert.equal(imported.length, 2);
            assert.deepEqual(
              imported.find((c: { name: string }) => c.name === "Watch")
                .itemIds,
              [foreignItem],
            );
            assert.deepEqual(
              imported.find((c: { name: string }) => c.name === "Empty")
                .itemIds,
              [],
            );
            await assert.rejects(
              importCollections(
                client,
                owner.id,
                Array.from({ length: 101 }, () => ({
                  name: "Overflow",
                  items: [],
                })),
              ),
              z.ZodError,
            );
            await assert.rejects(
              importCollections(client, owner.id, [
                {
                  name: "Overflow",
                  items: Array.from(
                    { length: 10001 },
                    () => portable[0].items[0],
                  ),
                },
              ]),
              z.ZodError,
            );
            await client.query("begin");
            await importCollections(client, owner.id, [
              { name: "Rolled back", items: [] },
            ]);
            await client.query("rollback");
            assert.equal((await list()).length, 1);
          } finally {
            await client.query("rollback");
            client.release();
          }
        },
      );
      await t.test(
        "collection deletion preserves library; library and account deletion cascade",
        async () => {
          assert.equal(
            (await request("DELETE", `${base}/${id}`)).statusCode,
            200,
          );
          assert.equal(
            (await pool.query("select id from library where id=$1", [ownItem]))
              .rowCount,
            1,
          );
          assert.equal(
            (
              await pool.query(
                "select * from collection_memberships where collection_id=$1",
                [id],
              )
            ).rowCount,
            0,
          );
          const next = await create("Next");
          await request("PUT", `${base}/${next}/items/${ownItem}`);
          await pool.query("delete from library where id=$1", [ownItem]);
          assert.deepEqual(await list(), [
            { id: next, name: "Next", itemIds: [] },
          ]);
          await pool.query("delete from accounts where id=$1", [other.id]);
          assert.equal(
            (
              await pool.query("select * from collections where user_id=$1", [
                other.id,
              ])
            ).rowCount,
            0,
          );
          assert.equal(
            (
              await pool.query(
                "select * from collection_memberships where user_id=$1",
                [other.id],
              )
            ).rowCount,
            0,
          );
        },
      );
    } finally {
      await pool.query("delete from accounts where id=any($1::uuid[])", [
        [owner.id, other.id],
      ]);
      await app.close();
      await pool.end();
    }
  },
);

test(
  "export/import routes round-trip collections and board-game tracking between authenticated owners without overwriting library fields",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const app = await buildServer(pool, {
      origin: "http://localhost:3200",
      secure: false,
      registration: true,
    });
    const emails = [0, 1].map(
      () => `collection-roundtrip-${randomUUID()}@example.invalid`,
    );
    const request = async (
      method: "GET" | "POST" | "PUT",
      url: string,
      cookie?: string,
      payload?: unknown,
    ) => {
      const response = await app.inject({
        method,
        url,
        payload,
        headers: {
          origin: "http://localhost:3200",
          ...(cookie ? { cookie } : {}),
        },
      });
      assert.equal(
        response.statusCode,
        200,
        `${method} ${url}: ${response.body}`,
      );
      return response;
    };
    const library = async (cookie: string) =>
      (await request("GET", "/api/library", cookie))
        .json<LibraryItem[]>()
        .sort((a, b) => mediaKey(a).localeCompare(mediaKey(b)));
    const shelves = async (cookie: string) =>
      (await request("GET", base, cookie))
        .json<Collection[]>()
        .sort((a, b) => a.name.localeCompare(b.name));
    const tracking: Tracking = {
      status: "in_progress",
      rating: 4.5,
      favorite: true,
      current: 0,
      total: null,
      notes: "Game night: keep this note.\nSecond line.",
      owned: true,
      playCount: 17,
      lastPlayedAt: "2026-09-28",
      startedAt: "2025-02-03",
      finishedAt: null,
      season: null,
    };
    const boardgame = {
      media: {
        type: "boardgame",
        source: "bgg",
        externalId: "42",
        title: "A Tabletop Favorite",
        creators: ["A Designer"],
        image: "https://example.invalid/boardgame.jpg",
        description: "A cooperative game.",
        metadata: {
          minPlayers: 2,
          maxPlayers: 4,
          playMinutes: 60,
          categories: ["Adventure"],
        },
      },
      tracking,
      createdAt: "2025-02-03T04:05:06.000Z",
    };
    const movie = {
      media: {
        type: "movie",
        source: "tmdb",
        externalId: "42",
        title: "A Movie Favorite",
        creators: ["A Director"],
        image: null,
        description: "A movie description.",
        metadata: { year: 2020 },
      },
      tracking: {
        status: "completed" as const,
        rating: 3.5,
        favorite: false,
        current: 1,
        total: 1,
        notes: "Source movie note",
        startedAt: "2020-03-01",
        finishedAt: "2020-03-01",
        season: null,
      },
      createdAt: "2020-03-01T12:00:00.000Z",
    };
    const existingMovie = {
      ...movie,
      media: {
        ...movie.media,
        title: "Receiver's saved title",
        description: "Receiver's description",
        metadata: { year: 2021, custom: "keep" },
      },
      tracking: {
        ...movie.tracking,
        rating: 5,
        favorite: true,
        notes: "Receiver's private note",
      },
      createdAt: "2021-04-05T06:07:08.000Z",
    };
    try {
      await migrate(pool);
      const cookies: string[] = [];
      for (const email of emails) {
        const registered = await request("POST", "/api/register", undefined, {
          email,
          password: "collection-roundtrip-password",
        });
        assert.ok(registered.headers["set-cookie"]);
        cookies.push(String(registered.headers["set-cookie"]).split(";")[0]);
      }
      const [source, receiver] = cookies;
      await request("POST", "/api/import", source, {
        entries: [boardgame, movie],
      });
      const sourceLibrary = await library(source);
      assert.equal(sourceLibrary.length, 2);
      const created = (
        await request("POST", base, source, { name: "Favorites" })
      ).json<Collection>();
      for (const item of sourceLibrary)
        await request("PUT", `${base}/${created.id}/items/${item.id}`, source);
      await request("POST", base, source, { name: "Empty shelf" });
      const sourceShelves = await shelves(source);
      const exported = (await request("GET", "/api/export", source)).json();
      assert.equal(exported.format, "marqd-v2");
      assert.equal(exported.version, 1);
      assert.deepEqual(exported.entries, [movie, boardgame]);
      assert.deepEqual(exported.collections, [
        {
          name: "Favorites",
          items: [
            { type: "boardgame", source: "bgg", externalId: "42" },
            { type: "movie", source: "tmdb", externalId: "42" },
          ],
        },
        { name: "Empty shelf", items: [] },
      ]);
      assert.deepEqual(
        (await request("GET", "/api/export", receiver)).json().collections,
        [],
      );
      await request("POST", "/api/import", receiver, {
        entries: [existingMovie],
      });
      const receiverBefore = await library(receiver);
      const first = await request("POST", "/api/import", receiver, exported);
      assert.deepEqual(first.json(), { added: 1, skipped: 1 });
      const receivedLibrary = await library(receiver);
      assert.equal(receivedLibrary.length, 2);
      const receivedBoardgame = receivedLibrary.find(
        (item) => item.type === "boardgame",
      )!;
      assert.ok(receivedBoardgame);
      assert.deepEqual(receivedBoardgame.tracking, tracking);
      assert.deepEqual(
        receivedLibrary.find((item) => item.type === "movie"),
        receiverBefore[0],
      );
      const receivedShelves = await shelves(receiver);
      assert.equal(receivedShelves.length, 2);
      assert.deepEqual(
        receivedShelves.find((shelf) => shelf.name === "Empty shelf")!.itemIds,
        [],
      );
      const favorites = receivedShelves.find(
        (shelf) => shelf.name === "Favorites",
      )!;
      assert.notEqual(favorites.id, created.id);
      assert.deepEqual(
        [...favorites.itemIds].sort(),
        receivedLibrary.map((item) => item.id).sort(),
      );
      for (const item of receivedLibrary) {
        const original = sourceLibrary.find(
          (candidate) => mediaKey(candidate) === mediaKey(item),
        );
        assert.ok(original);
        assert.notEqual(item.id, original.id);
        assert.ok(!favorites.itemIds.includes(original.id));
      }
      const receivedExport = (
        await request("GET", "/api/export", receiver)
      ).json();
      assert.deepEqual(receivedExport.entries, [existingMovie, boardgame]);
      const byName = (a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name);
      // Imported collections share a transaction timestamp; UUID order may differ.
      assert.deepEqual(
        [...receivedExport.collections].sort(byName),
        [...exported.collections].sort(byName),
      );

      const repeated = await request("POST", "/api/import", receiver, exported);
      assert.deepEqual(repeated.json(), { added: 0, skipped: 2 });
      assert.deepEqual(await library(receiver), receivedLibrary);
      assert.deepEqual(await shelves(receiver), receivedShelves);
      assert.deepEqual(
        (await request("GET", "/api/export", receiver)).json(),
        receivedExport,
      );
      assert.deepEqual(await library(source), sourceLibrary);
      assert.deepEqual(await shelves(source), sourceShelves);
      assert.deepEqual(
        (await request("GET", "/api/export", source)).json(),
        exported,
      );
    } finally {
      try {
        await pool.query("delete from accounts where email=any($1::text[])", [
          emails,
        ]);
      } finally {
        await app.close();
        await pool.end();
      }
    }
  },
);
