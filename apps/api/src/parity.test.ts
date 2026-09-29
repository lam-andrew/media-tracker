import { diversify } from "./recommendations.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { buildServer } from "./server.js";
import { migrate } from "./migrate.js";
import { newToken, tokenHash } from "./auth.js";
import { rank } from "./catalog.js";
import { mediaKey, type Media } from "../../../packages/contracts/src/index.js";
import {
  parseImportFile,
  toImportRows,
} from "../../../packages/contracts/src/import/index.js";
const movie: Media = {
  source: "tmdb",
  externalId: "42",
  type: "movie",
  title: "The Answer",
  creators: [],
  image: null,
  description: "Description",
  metadata: { year: 2020 },
};
const tracking = {
  status: "completed",
  rating: 4.5,
  favorite: true,
  current: 0,
  total: null,
  notes: "A memory",
  finishedAt: "2020-03-01",
  startedAt: "2020-02-29",
  season: null,
};
test("media keys retain type, search puts exact titles first", () => {
  assert.notEqual(mediaKey(movie), mediaKey({ ...movie, type: "tv" }));
  assert.equal(
    rank(
      [{ ...movie, title: "Another", externalId: "43" }, movie],
      "The Answer",
    )[0].title,
    movie.title,
  );
});
test("CSV imports preserve ratings, notes, and completion dates", () => {
  const parsed = parseImportFile(
    'Date,Name,Year,Letterboxd URI,Rating,Review\n2020-03-01,The Answer,2020,https://letterboxd.com/film/example/,4.5,"A memory, kept"',
  );
  assert.equal(parsed.detected, "letterboxd");
  const rows = toImportRows(parsed.detected!, parsed.objects);
  assert.equal(rows[0].rating, 4.5);
  assert.equal(rows[0].notes, "A memory, kept");
  assert.equal(rows[0].finishedAt, "2020-03-01");
});
test(
  "migration ledger, imports, goals, exports, recovery and delete-account isolation",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await migrate(pool);
    await migrate(pool);
    const app = await buildServer(pool, {
      origin: "http://localhost:3200",
      secure: false,
      registration: true,
    });
    const emails = [
      `parity-${randomUUID()}@example.invalid`,
      `parity-${randomUUID()}@example.invalid`,
    ];
    const req = (
      method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
      url: string,
      payload?: unknown,
      cookie?: string,
    ) =>
      app.inject({
        method,
        url,
        payload,
        headers: {
          origin: "http://localhost:3200",
          ...(cookie ? { cookie } : {}),
        },
      });
    try {
      const a = await req("POST", "/api/register", {
        email: emails[0],
        password: "long-test-password",
      });
      const b = await req("POST", "/api/register", {
        email: emails[1],
        password: "long-test-password",
      });
      assert.equal(a.statusCode, 200);
      assert.equal(b.statusCode, 200);
      const ac = String(a.headers["set-cookie"]).split(";")[0],
        bc = String(b.headers["set-cookie"]).split(";")[0];
      const payload = {
        entries: [
          { media: movie, tracking },
          { media: { ...movie, type: "tv" }, tracking },
        ],
        goals: [{ year: 2020, type: "movie", target: 24 }],
      };
      const imported = await req("POST", "/api/import", payload, ac);
      assert.equal(imported.statusCode, 200, imported.body);
      assert.equal(imported.json().added, 2);
      assert.equal(
        (await req("POST", "/api/import", payload, ac)).json().skipped,
        2,
      );
      const exported = (await req("GET", "/api/export", undefined, ac)).json();
      assert.equal(exported.entries.length, 2);
      assert.deepEqual(exported.entries[0].tracking, tracking);
      assert.equal(exported.goals[0].target, 24);
      assert.equal(
        (await req("GET", "/api/export", undefined, bc)).json().entries.length,
        0,
      );
      assert.equal(
        (await req("GET", "/api/goals", undefined, bc)).json().length,
        0,
      );
      const ids = (await req("GET", "/api/library", undefined, ac)).json();
      await req("DELETE", "/api/library/" + ids[0].id, undefined, bc);
      assert.equal(
        (await req("GET", "/api/library", undefined, ac)).json().length,
        2,
      );
      assert.equal(
        (await req("PATCH", "/api/profile", { displayName: "Reader" }, ac))
          .statusCode,
        200,
      );
      assert.equal(
        (await req("GET", "/api/profile", undefined, ac)).json().displayName,
        "Reader",
      );
      assert.equal(
        (
          await req(
            "POST",
            "/api/import",
            {
              entries: [
                { media: movie, tracking: { ...tracking, rating: 4.2 } },
              ],
            },
            ac,
          )
        ).statusCode,
        400,
      );
      const token = newToken();
      await pool.query(
        "insert into account_tokens(token_hash,user_id,purpose,expires_at) values($1,$2,'reset',now()+interval '10 minutes')",
        [tokenHash(token), a.json().user.id],
      );
      const reset = await req("POST", "/api/auth/complete", {
        purpose: "reset",
        token,
        password: "new-long-test-password",
      });
      assert.equal(reset.statusCode, 200, reset.body);
      assert.equal(
        (await req("GET", "/api/library", undefined, ac)).statusCode,
        401,
      );
      assert.equal(
        (
          await req("POST", "/api/auth/complete", {
            purpose: "reset",
            token,
            password: "another-test-password",
          })
        ).statusCode,
        400,
      );
      const login = await req("POST", "/api/login", {
        email: emails[0],
        password: "new-long-test-password",
      });
      assert.equal(login.statusCode, 200);
      const nc = String(login.headers["set-cookie"]).split(";")[0];
      assert.equal(
        (
          await req(
            "DELETE",
            "/api/account",
            { confirmation: "DELETE", password: "incorrect-password" },
            nc,
          )
        ).statusCode,
        401,
      );
      assert.equal(
        (
          await req(
            "DELETE",
            "/api/account",
            { confirmation: "DELETE", password: "new-long-test-password" },
            nc,
          )
        ).statusCode,
        200,
      );
      assert.equal(
        (await req("GET", "/api/library", undefined, nc)).statusCode,
        401,
      );
      assert.equal(
        (await req("GET", "/api/library", undefined, bc)).statusCode,
        200,
      );
    } finally {
      await pool.query("delete from accounts where email=any($1::text[])", [
        emails,
      ]);
      await app.close();
      await pool.end();
    }
  },
);

test("near-duplicate titles keep the edition with artwork", () => {
  const result = rank(
    [
      movie,
      { ...movie, externalId: "43", image: "https://example.org/cover.jpg" },
    ],
    "The Answer",
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].externalId, "43");
});

test("recommendations balance media types and avoid repeated suggestions", () => {
  const rows = diversify(
    [
      { reason: "Seed A", items: [movie, { ...movie, externalId: "43" }] },
      { reason: "Seed B", items: [movie, { ...movie, type: "tv" }] },
    ],
    2,
  );
  assert.deepEqual(
    rows[0].items.map((m) => m.type),
    ["movie", "tv"],
  );
  const keys = rows.flatMap((r) => r.items.map(mediaKey));
  assert.equal(keys.length, new Set(keys).size);
  assert.equal(rows[0].items[0].metadata.recommendationReason, "Seed A");
});
