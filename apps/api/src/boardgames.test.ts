import { test } from "node:test";
import assert from "node:assert/strict";
import { createBoardGames, type BoardGamesOptions } from "./boardgames.js";

const game = (id = "42", extra = "") => `<item type="boardgame" id="${id}">
<name type="alternate" value="Alternate"/><name type="primary" value="Wings &amp; Things"/>
<description>Build &amp; play.&#10;Next turn.</description>
<image>http://cf.geekdo-images.com/cover.jpg</image>
<yearpublished value="2020"/><minplayers value="1"/><maxplayers value="4"/>
<minage value="10"/><playingtime value="60"/><minplaytime value="30"/><maxplaytime value="75"/>
<link type="boardgamedesigner" value="A Designer"/><link type="boardgamedesigner" value="B Designer"/>
<link type="boardgamecategory" id="1000" value="Animals"/>
<link type="boardgamemechanic" value="Drafting"/>${extra}</item>`;
const items = (body = "") => `<items>${body}</items>`;
function fixture(
  responses: (string | number | Error)[],
  options: BoardGamesOptions = {},
) {
  let clock = 0;
  const calls: { url: URL; init?: RequestInit; at: number }[] = [];
  const provider = createBoardGames({
    token: "secret-token",
    now: () => clock,
    sleep: async (ms, signal) => {
      signal.throwIfAborted();
      clock += ms;
    },
    fetch: async (input, init) => {
      calls.push({ url: new URL(String(input)), init, at: clock });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.notEqual(response, undefined, "Unexpected fetch");
      return typeof response === "number"
        ? new Response("private upstream message", { status: response })
        : new Response(response);
    },
    ...options,
  });
  return {
    provider,
    calls,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

test("maps hydrated details, entities and designers; caches immutable results", async () => {
  const { provider, calls } = fixture([items(game())]);
  const value = await provider.get("42");
  assert.deepEqual(value, {
    source: "bgg",
    type: "boardgame",
    externalId: "42",
    title: "Wings & Things",
    creators: ["A Designer", "B Designer"],
    image: "https://cf.geekdo-images.com/cover.jpg",
    description: "Build & play.\nNext turn.",
    metadata: {
      year: 2020,
      minPlayers: 1,
      maxPlayers: 4,
      playingTime: 60,
      minAge: 10,
      minPlayMinutes: 30,
      maxPlayMinutes: 75,
      categories: ["Animals"],
      mechanics: ["Drafting"],
      expansion: false,
    },
  });
  value.title = "mutation";
  assert.equal((await provider.get("42")).title, "Wings & Things");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://boardgamegeek.com");
  assert.equal(
    new Headers(calls[0].init?.headers).get("Authorization"),
    "Bearer secret-token",
  );
  assert.equal(calls[0].init?.redirect, "error");
});

test("search hydrates at most 20 IDs in one batch and preserves order", async () => {
  const rows = Array.from(
    { length: 25 },
    (_, i) => `<item type="boardgame" id="${i + 1}"/>`,
  ).join("");
  const { provider, calls } = fixture(
    [
      items(rows),
      items(
        Array.from({ length: 20 }, (_, i) => game(String(20 - i))).join(""),
      ),
    ],
    { cacheSize: 1 },
  );
  const result = await provider.search("Wings & Things");
  assert.equal(result.length, 20);
  assert.equal(result[0].externalId, "1");
  assert.equal(result[19].externalId, "20");
  assert.equal(calls[0].url.searchParams.get("query"), "Wings & Things");
  assert.equal(
    calls[1].url.searchParams.get("id"),
    Array.from({ length: 20 }, (_, i) => i + 1).join(","),
  );
  assert.equal(calls[1].at - calls[0].at, 5000);
  assert.equal((await provider.search(" wings & things ")).length, 20);
  assert.equal(calls.length, 2);
});

test("empty searches and absent things; rejects unsafe inputs without fetch", async () => {
  const { provider, calls } = fixture(['<items total="0"/>', items()]);
  assert.deepEqual(await provider.search("  "), []);
  assert.deepEqual(await provider.search("missing"), []);
  await assert.rejects(provider.get("42"), { statusCode: 404 });
  for (const id of ["0", "-1", "1,2", "../42", "1?key=x", "99999999999"])
    await assert.rejects(provider.get(id), { statusCode: 400 });
  await assert.rejects(provider.search("x".repeat(201)), { statusCode: 400 });
  assert.equal(calls.length, 2);
});

test("missing token gives actionable error before network", async () => {
  const { provider, calls } = fixture([], { token: "" });
  await assert.rejects(
    provider.search("game"),
    /Set BGG_API_TOKEN on the API server/,
  );
  await assert.rejects(provider.get("42"), /BGG_API_TOKEN/);
  assert.equal(calls.length, 0);
});

test("rejects malformed XML, HTML, API errors and DTDs without exposing bodies", async () => {
  for (const xml of [
    "<items><item></items>",
    "<html>secret-token</html>",
    '<errors><error message="secret-token"/></errors>',
    '<items><error message="secret-token"/></items>',
    '<!DOCTYPE items [<!ENTITY x "secret-token">]><items>&x;</items>',
  ]) {
    const { provider, calls } = fixture([xml]);
    await assert.rejects(
      provider.get("42"),
      (e) =>
        e instanceof Error &&
        !e.message.includes("secret-token") &&
        /unavailable/.test(e.message),
    );
    assert.equal(calls.length, 1);
  }
});

test("authentication fails without retry; transient responses retry once at throttle", async () => {
  for (const status of [401, 403]) {
    const { provider, calls } = fixture([status]);
    await assert.rejects(provider.get("42"), /Check BGG_API_TOKEN/);
    assert.equal(calls.length, 1);
  }
  for (const status of [202, 429, 500, 503]) {
    const { provider, calls } = fixture([status, items(game())]);
    assert.equal((await provider.get("42")).externalId, "42");
    assert.deepEqual(
      calls.map((c) => c.at),
      [0, 5000],
    );
  }
  const { provider, calls } = fixture([503, 503]);
  await assert.rejects(provider.get("42"), /unavailable/);
  assert.equal(calls.length, 2);
});

test("network exceptions are sanitized even when they carry a statusCode", async () => {
  const failure = Object.assign(new Error("secret-token"), { statusCode: 500 });
  const { provider } = fixture([failure, failure]);
  await assert.rejects(
    provider.get("42"),
    (e) => e instanceof Error && !e.message.includes("secret-token"),
  );
});

test("concurrent calls coalesce and queue starts five seconds apart", async () => {
  const { provider, calls } = fixture([items(game("1")), items(game("2"))]);
  const [first, duplicate, second] = await Promise.all([
    provider.get("1"),
    provider.get("1"),
    provider.get("2"),
  ]);
  assert.deepEqual(first, duplicate);
  assert.equal(second.externalId, "2");
  assert.deepEqual(
    calls.map((c) => c.at),
    [0, 5000],
  );
});

test("detail cache expires and evicts; search cache also evicts", async () => {
  const { provider, calls, advance } = fixture(
    [
      items(game("1")),
      items(game("2")),
      items(game("1")),
      items(game("1")),
      items(),
      items(),
      items(),
    ],
    { cacheSize: 1, cacheTtlMs: 10000 },
  );
  await provider.get("1");
  await provider.get("2");
  await provider.get("1");
  advance(10001);
  await provider.get("1");
  await provider.search("one");
  await provider.search("two");
  await provider.search("one");
  assert.equal(calls.length, 7);
});

test("expansion category and item type; absent and unsafe optional fields", async () => {
  const { provider } = fixture([
    items(
      game(
        "1",
        '<link type="boardgamecategory" id="1042" value="Expansion for Base-game"/>',
      ),
    ),
    items(
      '<item type="boardgameexpansion" id="2"><name type="primary" value="Expansion"/><image>javascript:bad</image><yearpublished value="0"/><minplayers value="oops"/></item>',
    ),
  ]);
  assert.equal((await provider.get("1")).metadata.expansion, true);
  const expansion = await provider.get("2");
  assert.equal(expansion.metadata.expansion, true);
  assert.equal(expansion.image, null);
  assert.equal(expansion.metadata.year, null);
  assert.equal(expansion.metadata.minPlayers, null);
  assert.deepEqual(expansion.creators, []);
});

test("overall deadline bounds stalled fetch; rejects queue overload", async () => {
  const provider = createBoardGames({
    token: "test",
    timeoutMs: 20,
    requestTimeoutMs: 20,
    fetch: async () => new Promise<Response>(() => {}),
  });
  const pending = [provider.get("1"), provider.get("2"), provider.get("3")].map(
    (p) => assert.rejects(p, /unavailable/),
  );
  await assert.rejects(provider.get("4"), /busy/);
  await Promise.all(pending);
});

test("per-request timeout aborts fetch and retries only once", async () => {
  let calls = 0;
  const { provider } = fixture([], {
    requestTimeoutMs: 5,
    fetch: async (_url, init) => {
      calls++;
      return new Promise<Response>((_, reject) =>
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("secret-token")),
          { once: true },
        ),
      );
    },
  });
  await assert.rejects(provider.get("1"), /unavailable/);
  assert.equal(calls, 2);
});

test("rejects oversized XML and recovers queue after failure", async () => {
  const { provider, calls } = fixture([
    items("x".repeat(2_000_001)),
    items(game()),
  ]);
  await assert.rejects(provider.get("42"), /unavailable/);
  assert.equal((await provider.get("42")).externalId, "42");
  assert.deepEqual(
    calls.map((c) => c.at),
    [0, 5000],
  );
});

test("search ignores invalid, duplicate and unrelated identifiers", async () => {
  const { provider, calls } = fixture([
    items(
      '<item type="boardgame" id="42"/><item type="boardgame" id="42"/><item type="boardgame" id="../43"/><item type="videogame" id="44"/>',
    ),
    items(game() + game("45")),
  ]);
  assert.deepEqual(
    (await provider.search("Wings")).map((m) => m.externalId),
    ["42"],
  );
  assert.equal(calls[1].url.searchParams.get("id"), "42");
});
