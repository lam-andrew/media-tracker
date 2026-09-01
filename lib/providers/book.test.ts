import { describe, it, expect, vi, afterEach } from "vitest";
import { bookProvider } from "./book";

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

afterEach(() => vi.unstubAllGlobals());

describe("bookProvider.search fallback", () => {
  it("returns Open Library results when available", async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return json(OL_DOCS);
    });
    const items = await bookProvider.search("eragon");
    expect(items[0].externalSource).toBe("openlibrary");
    // Google Books must not be hit on the happy path.
    expect(calls.some((u) => u.includes("googleapis.com"))).toBe(false);
  });

  it("falls back to Google Books when Open Library errors", async () => {
    mockFetch((url) =>
      url.includes("openlibrary.org") ? json({}, 500) : json(GOOGLE_ITEM),
    );
    const items = await bookProvider.search("eragon");
    expect(items).toHaveLength(1);
    expect(items[0].externalSource).toBe("googlebooks");
  });

  it("falls back to Google Books when Open Library returns nothing", async () => {
    mockFetch((url) =>
      url.includes("openlibrary.org") ? json({ docs: [] }) : json(GOOGLE_ITEM),
    );
    const items = await bookProvider.search("eragon");
    expect(items[0].externalSource).toBe("googlebooks");
  });
});
