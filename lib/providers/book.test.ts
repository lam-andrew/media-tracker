import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { MetadataProvider } from "./types";

type FetchImpl = (url: string) => Promise<Response>;

function mockFetch(impl: FetchImpl) {
  vi.stubGlobal("fetch", vi.fn(impl as unknown as typeof fetch));
}

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

const GOOGLE_ITEM = {
  items: [
    {
      id: "g1",
      volumeInfo: { title: "Eragon", authors: ["Christopher Paolini"] },
    },
  ],
};
const OL_DOCS = {
  docs: [{ key: "/works/OL1W", title: "Eragon", author_name: ["Paolini"] }],
};

// The provider decides its order when the module loads, so each mode gets a
// fresh import after the env is set.
async function load(key: string | undefined): Promise<MetadataProvider> {
  vi.resetModules();
  if (key) vi.stubEnv("GOOGLE_BOOKS_API_KEY", key);
  return (await import("./book")).bookProvider;
}

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("bookProvider without a Google Books key (Open Library primary)", () => {
  it("returns Open Library results and never calls Google Books", async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return json(OL_DOCS);
    });
    const items = await (await load(undefined)).search("eragon");
    expect(items[0].externalSource).toBe("openlibrary");
    expect(calls.some((u) => u.includes("googleapis.com"))).toBe(false);
  });

  it("falls back to Google Books when Open Library errors or is empty", async () => {
    mockFetch((url) =>
      url.includes("openlibrary.org") ? json({}, 500) : json(GOOGLE_ITEM),
    );
    expect((await (await load(undefined)).search("x"))[0].externalSource).toBe(
      "googlebooks",
    );
    mockFetch((url) =>
      url.includes("openlibrary.org") ? json({ docs: [] }) : json(GOOGLE_ITEM),
    );
    expect((await (await load(undefined)).search("x"))[0].externalSource).toBe(
      "googlebooks",
    );
  });
});

describe("bookProvider with a Google Books key (Google primary)", () => {
  it("returns Google Books results, sending the key, and skips Open Library", async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return json(GOOGLE_ITEM);
    });
    const items = await (await load("test-key")).search("eragon");
    expect(items[0].externalSource).toBe("googlebooks");
    expect(calls[0]).toContain("key=test-key");
    expect(calls.some((u) => u.includes("openlibrary.org"))).toBe(false);
  });

  it("falls back to Open Library when Google Books 429s", async () => {
    mockFetch((url) =>
      url.includes("googleapis.com") ? json({}, 429) : json(OL_DOCS),
    );
    const items = await (await load("test-key")).search("eragon");
    expect(items[0].externalSource).toBe("openlibrary");
  });
});

describe("bookProvider.getById", () => {
  it("routes Open Library work keys to Open Library regardless of mode", async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return json({ title: "Eragon", covers: [1] });
    });
    const item = await (await load("test-key")).getById("/works/OL1W");
    expect(item?.externalSource).toBe("openlibrary");
    expect(calls[0]).toContain("openlibrary.org/works/OL1W");
  });
});
