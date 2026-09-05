import { describe, it, expect } from "vitest";
import { buildFeed, type Seed } from "./recommend";
import type { NormalizedItem } from "./providers/types";

function item(
  id: string,
  type = "book",
  over: Partial<NormalizedItem> = {},
): NormalizedItem {
  return {
    externalSource: "src",
    externalId: id,
    type,
    title: id,
    creators: [],
    imageUrl: `https://img/${id}.jpg`,
    releaseYear: null,
    metadata: {},
    ...over,
  };
}

function seed(title: string, type = "book"): Seed {
  return {
    title,
    type,
    externalSource: "src",
    externalId: `seed-${title}`,
    creators: [],
    genres: [],
  };
}

const opts = { limit: 12, rowSize: 8, minRow: 3, maxRows: 3 };
const ids = (xs: { externalId: string }[]) => xs.map((x) => x.externalId);

describe("buildFeed", () => {
  it("drops owned items, imageless items, and the seeds themselves", () => {
    const seeds = [seed("Dune")];
    const batches = [
      [
        item("owned"),
        item("noimg", "book", { imageUrl: null }),
        item("seed-Dune"),
        item("keep"),
      ],
    ];
    const feed = buildFeed(seeds, batches, new Set(["src:owned"]), opts);
    expect(ids(feed.forYou.map((r) => r.item))).toEqual(["keep"]);
  });

  it("scores repeats, ranks them first, and explains with the first seed", () => {
    const seeds = [seed("Dune"), seed("Foundation")];
    const batches = [
      [item("a"), item("b")],
      [item("b"), item("c")],
    ];
    const feed = buildFeed(seeds, batches, new Set(), opts);
    expect(feed.forYou[0]).toMatchObject({
      item: { externalId: "b" },
      score: 2,
      because: "Dune",
    });
    expect(feed.forYou.find((r) => r.item.externalId === "c")?.because).toBe(
      "Foundation",
    );
  });

  it("round-robins across media types so one type can't flood the feed", () => {
    const seeds = [seed("G", "game"), seed("B", "book")];
    const batches = [
      [
        item("g1", "game"),
        item("g2", "game"),
        item("g3", "game"),
        item("g4", "game"),
      ],
      [item("b1", "book"), item("b2", "book")],
    ];
    const feed = buildFeed(seeds, batches, new Set(), { ...opts, limit: 4 });
    expect(feed.forYou.map((r) => r.item.type)).toEqual([
      "game",
      "book",
      "game",
      "book",
    ]);
  });

  it("builds per-seed rows from the leftovers, never repeating a title", () => {
    const seeds = [seed("Dune"), seed("Alien", "movie")];
    const batches = [
      [item("a"), item("b"), item("c"), item("d"), item("e")],
      [
        item("m1", "movie"),
        item("m2", "movie"),
        item("m3", "movie"),
        item("m4", "movie"),
      ],
    ];
    // Tiny forYou so plenty is left for the rows.
    const feed = buildFeed(seeds, batches, new Set(), { ...opts, limit: 2 });
    const inForYou = new Set(ids(feed.forYou.map((r) => r.item)));
    const inRows = feed.bySeed.flatMap((r) => ids(r.items));
    expect(feed.bySeed.map((r) => r.seed.title)).toEqual(["Dune", "Alien"]);
    expect(inRows.some((k) => inForYou.has(k))).toBe(false);
    expect(new Set(inRows).size).toBe(inRows.length);
  });

  it("drops rows thinner than minRow, caps rowSize and maxRows", () => {
    const seeds = [seed("S1"), seed("S2"), seed("S3"), seed("S4"), seed("S5")];
    const many = (p: string) =>
      Array.from({ length: 10 }, (_, i) => item(`${p}${i}`));
    const batches = [
      many("a"),
      [item("thin1"), item("thin2")],
      many("c"),
      many("d"),
      many("e"),
    ];
    const feed = buildFeed(seeds, batches, new Set(), { ...opts, limit: 0 });
    expect(feed.bySeed.map((r) => r.seed.title)).toEqual(["S1", "S3", "S4"]);
    expect(feed.bySeed.every((r) => r.items.length <= opts.rowSize)).toBe(true);
  });

  it("returns empty views when there is nothing to suggest", () => {
    expect(buildFeed([], [], new Set(), opts)).toEqual({
      forYou: [],
      bySeed: [],
    });
  });
});
