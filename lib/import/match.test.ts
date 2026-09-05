import { describe, it, expect, vi, afterEach } from "vitest";
import type { NormalizedItem } from "@/lib/providers/types";
import { lookupIsbn, mapPool, matchRow, pickBest } from "./match";
import type { ImportRow } from "./types";

const search = vi.fn<(q: string) => Promise<NormalizedItem[]>>();

vi.mock("@/lib/providers/registry", () => ({
  getProvider: (type: string) =>
    type === "book" || type === "movie"
      ? { type, search: (q: string) => search(q), getById: async () => null }
      : undefined,
}));

function json(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function row(partial: Partial<ImportRow>): ImportRow {
  return {
    type: "book",
    title: "Eragon (The Inheritance Cycle, #1)",
    creators: ["Christopher Paolini"],
    year: 2002,
    isbn: null,
    rating: null,
    status: "completed",
    finishedAt: null,
    notes: null,
    sourceRef: "1",
    ...partial,
  };
}

function item(partial: Partial<NormalizedItem>): NormalizedItem {
  return {
    externalSource: "openlibrary",
    externalId: "/works/OL1W",
    type: "book",
    title: "Eragon",
    creators: [],
    imageUrl: null,
    releaseYear: null,
    metadata: {},
    ...partial,
  };
}

afterEach(() => {
  search.mockReset();
  vi.unstubAllGlobals();
});

describe("lookupIsbn", () => {
  it("builds a work-keyed item from the Open Library edition", async () => {
    const fetchImpl = vi.fn((url: string) => {
      expect(url).toBe("https://openlibrary.org/isbn/9780375826696.json");
      return json({
        works: [{ key: "/works/OL5W" }],
        title: "Eragon",
        covers: [-1, 123],
        number_of_pages: 503,
      });
    });
    const result = await lookupIsbn(
      row({ isbn: "9780375826696" }),
      fetchImpl as unknown as typeof fetch,
    );
    expect(result).toEqual({
      externalSource: "openlibrary",
      externalId: "/works/OL5W",
      type: "book",
      title: "Eragon",
      creators: ["Christopher Paolini"],
      imageUrl: "https://covers.openlibrary.org/b/id/123-L.jpg",
      releaseYear: 2002,
      metadata: { isbn: "9780375826696", pageCount: 503 },
    });
  });

  it("returns null on 404 or when the edition has no work", async () => {
    const notFound = vi.fn(() => json({}, 404)) as unknown as typeof fetch;
    expect(await lookupIsbn(row({ isbn: "1" }), notFound)).toBeNull();
    const noWork = vi.fn(() => json({ title: "x" })) as unknown as typeof fetch;
    expect(await lookupIsbn(row({ isbn: "1" }), noWork)).toBeNull();
    expect(await lookupIsbn(row({ isbn: null }), notFound)).toBeNull();
  });
});

describe("pickBest", () => {
  it("returns none with no candidates", () => {
    expect(pickBest(row({}), [])).toEqual({ item: null, confidence: "none" });
  });

  it("is exact when the best title also matches the year", () => {
    const hit = item({ title: "Eragon", releaseYear: 2002 });
    const other = item({ title: "Eragon", releaseYear: 2011, externalId: "x" });
    expect(pickBest(row({}), [other, hit])).toEqual({
      item: hit,
      confidence: "exact",
    });
  });

  it("is likely when the title matches but the year does not", () => {
    const hit = item({ title: "Eragon", releaseYear: 2011 });
    expect(pickBest(row({}), [hit]).confidence).toBe("likely");
  });

  it("is none (but still suggests the best hit) below the threshold", () => {
    const miss = item({ title: "Completely Different Thing" });
    expect(pickBest(row({}), [miss])).toEqual({
      item: miss,
      confidence: "none",
    });
  });
});

describe("matchRow", () => {
  it("prefers the ISBN lookup and never searches when it succeeds", async () => {
    const fetchImpl = vi.fn(() =>
      json({ works: [{ key: "/works/OL5W" }], title: "Eragon" }),
    ) as unknown as typeof fetch;
    const result = await matchRow(row({ isbn: "9780375826696" }), fetchImpl);
    expect(result.confidence).toBe("exact");
    expect(result.item?.externalId).toBe("/works/OL5W");
    expect(search).not.toHaveBeenCalled();
  });

  it("falls back to a cleaned title + author search when ISBN lookup fails", async () => {
    const fetchImpl = vi.fn(() => json({}, 500)) as unknown as typeof fetch;
    search.mockResolvedValue([item({ title: "Eragon", releaseYear: 2002 })]);
    const result = await matchRow(row({ isbn: "9780375826696" }), fetchImpl);
    expect(search).toHaveBeenCalledWith("Eragon Christopher Paolini");
    expect(result.confidence).toBe("exact");
  });

  it("matches movies by title with year preference", async () => {
    search.mockResolvedValue([
      item({
        type: "movie",
        title: "Dune",
        releaseYear: 1984,
        externalId: "1",
      }),
      item({
        type: "movie",
        title: "Dune",
        releaseYear: 2021,
        externalId: "2",
      }),
    ]);
    const result = await matchRow(
      row({ type: "movie", title: "Dune", creators: [], year: 2021 }),
    );
    expect(search).toHaveBeenCalledWith("Dune");
    expect(result.item?.externalId).toBe("2");
    expect(result.confidence).toBe("exact");
  });

  it("never throws: a failing search yields none", async () => {
    search.mockRejectedValue(new Error("boom"));
    const result = await matchRow(row({}));
    expect(result).toEqual({ row: row({}), item: null, confidence: "none" });
  });

  it("yields none for a type with no provider", async () => {
    const result = await matchRow(row({ type: "vinyl" }));
    expect(result.confidence).toBe("none");
  });
});

describe("mapPool", () => {
  it("preserves order and bounds concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const out = await mapPool([5, 1, 3, 2, 4], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, n));
      inFlight -= 1;
      return n * 10;
    });
    expect(out).toEqual([50, 10, 30, 20, 40]);
    expect(peak).toBe(2);
  });

  it("handles an empty list", async () => {
    expect(await mapPool([], 4, async (x: number) => x)).toEqual([]);
  });
});
