import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { migrate } from "./migrate.js";
import { Pool } from "pg";
import { buildServer } from "./server.js";
import { hashPassword, verifyPassword } from "./auth.js";
import { trackingSchema } from "../../../packages/contracts/src/index.js";
import { mapBook } from "./providers.js";
test("password hashes use distinct salts and reject wrong passwords", async () => {
  const a = await hashPassword("long-example-password");
  const b = await hashPassword("long-example-password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("long-example-password", a), true);
  assert.equal(await verifyPassword("wrong-password", a), false);
});
test("tracking rejects invalid totals and quarter-star ratings", () => {
  const data = {
    status: "in_progress",
    rating: 4.5,
    favorite: false,
    current: 12,
    total: 100,
    notes: "",
  };
  assert.equal(trackingSchema.safeParse(data).success, true);
  assert.equal(
    trackingSchema.safeParse({ ...data, rating: 4.25 }).success,
    false,
  );
  assert.equal(
    trackingSchema.safeParse({ ...data, current: 101 }).success,
    false,
  );
  assert.equal(trackingSchema.safeParse({ ...data, total: 0 }).success, false);
});
test("book mapping handles missing covers and page counts", () => {
  const m = mapBook({ key: "/works/OL1W", title: "A book" });
  assert.equal(m.image, null);
  assert.equal(m.metadata.pages, null);
  assert.deepEqual(m.creators, []);
});
test(
  "database isolation, authentication, concurrency, and persistence",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    await migrate(pool);
    const book = mapBook({
      key: "/works/OL1W",
      title: "Integration fixture",
      number_of_pages_median: 200,
    });
    const app = await buildServer(pool, {
      origin: "http://localhost:3200",
      registration: true,
      secure: false,
      provider: { search: async () => [book], get: async () => book },
    });
    const emails = [
      `test-${randomUUID()}@example.invalid`,
      `test-${randomUUID()}@example.invalid`,
    ];
    const request = (
      method: "GET" | "POST" | "PATCH",
      url: string,
      payload?: unknown,
      cookie?: string,
      origin = "http://localhost:3200",
    ) =>
      app.inject({
        method,
        url,
        payload,
        headers: { origin, ...(cookie ? { cookie } : {}) },
      });
    try {
      assert.equal((await request("GET", "/api/library")).statusCode, 401);
      assert.equal(
        (
          await request(
            "POST",
            "/api/register",
            { email: emails[0], password: "test-password-long" },
            undefined,
            "https://evil.example",
          )
        ).statusCode,
        403,
      );
      const a = await request("POST", "/api/register", {
        email: emails[0],
        password: "test-password-long",
      });
      assert.equal(a.statusCode, 200);
      const b = await request("POST", "/api/register", {
        email: emails[1],
        password: "test-password-long",
      });
      assert.equal(b.statusCode, 200);
      const ac = String(a.headers["set-cookie"]).split(";")[0],
        bc = String(b.headers["set-cookie"]).split(";")[0];
      assert.match(String(a.headers["set-cookie"]), /HttpOnly/);
      assert.equal(
        (
          await request("POST", "/api/login", {
            email: emails[0],
            password: "wrong-password-long",
          })
        ).statusCode,
        401,
      );
      const added = await request(
        "POST",
        "/api/library",
        {
          source: "openlibrary",
          externalId: book.externalId,
          status: "backlog",
        },
        ac,
      );
      assert.equal(added.statusCode, 201);
      const item = added.json();
      assert.equal(
        (await request("GET", "/api/library", undefined, bc)).json().length,
        0,
      );
      const tracking = {
        status: "in_progress",
        rating: 4.5,
        favorite: true,
        current: 42,
        total: 200,
        notes: "Saved across sessions",
      };
      assert.equal(
        (
          await request(
            "PATCH",
            `/api/library/${item.id}`,
            { version: 1, tracking },
            bc,
          )
        ).statusCode,
        404,
      );
      const changed = await request(
        "PATCH",
        `/api/library/${item.id}`,
        { version: 1, tracking },
        ac,
      );
      assert.equal(changed.statusCode, 200);
      assert.equal(changed.json().version, 2);
      assert.equal(
        (
          await request(
            "PATCH",
            `/api/library/${item.id}`,
            { version: 1, tracking },
            ac,
          )
        ).statusCode,
        409,
      );
      assert.equal(
        (
          await request(
            "PATCH",
            `/api/library/${item.id}`,
            { version: 2, tracking: { ...tracking, current: 201 } },
            ac,
          )
        ).statusCode,
        400,
      );
      const duplicate = await request(
        "POST",
        "/api/library",
        {
          source: "openlibrary",
          externalId: book.externalId,
          status: "backlog",
        },
        ac,
      );
      assert.equal(duplicate.json().tracking.notes, tracking.notes);
      assert.equal(
        (await request("GET", "/api/library", undefined, ac)).json().length,
        1,
      );
      await request("POST", "/api/logout", {}, ac);
      assert.equal(
        (await request("GET", "/api/library", undefined, ac)).statusCode,
        401,
      );
      const logged = await request("POST", "/api/login", {
        email: emails[0],
        password: "test-password-long",
      });
      assert.equal(logged.statusCode, 200);
      const data = (
        await request(
          "GET",
          "/api/library",
          undefined,
          String(logged.headers["set-cookie"]).split(";")[0],
        )
      ).json();
      assert.deepEqual(data[0].tracking, tracking);
    } finally {
      await pool.query("delete from accounts where email=any($1::text[])", [
        emails,
      ]);
      await app.close();
      await pool.end();
    }
  },
);
