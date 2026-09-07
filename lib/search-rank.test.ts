import { describe, it, expect } from "vitest";
import { rankResults } from "./search-rank";
import type { NormalizedItem } from "./providers/types";

function item(
  title: string,
  over: Partial<NormalizedItem> = {},
): NormalizedItem {
  return {
    externalSource: "src",
    externalId: title + (over.releaseYear ?? ""),
    type: "movie",
    title,
    creators: [],
    imageUrl: "https://img/x.jpg",
    releaseYear: 2000,
    metadata: {},
    ...over,
  };
}
const titles = (xs: NormalizedItem[]) => xs.map((x) => x.title);

describe("rankResults", () => {
  it("puts artwork first, then popularity, keeping source order as tiebreak", () => {
    const items = [
      item("no-art", { imageUrl: null, metadata: { popularity: 99 } }),
      item("meh", { metadata: { popularity: 1 } }),
      item("hit", { metadata: { popularity: 50 } }),
      item("tie-a"),
      item("tie-b"),
    ];
    expect(titles(rankResults(items))).toEqual([
      "hit",
      "meh",
      "tie-a",
      "tie-b",
      "no-art",
    ]);
  });

  it("promotes an exact title match above more popular near-misses", () => {
    const items = [
      item("Agamemnon in New York", { metadata: { popularity: 40 } }),
      item("Agamemnon", { metadata: { popularity: 3 } }),
    ];
    expect(titles(rankResults(items, "agamemnon"))[0]).toBe("Agamemnon");
  });

  it("collapses rows with the same type, title and year, keeping the best", () => {
    const items = [
      item("Agamemnon", { releaseYear: null, imageUrl: null, externalId: "1" }),
      item("Agamemnon", { releaseYear: null, imageUrl: null, externalId: "2" }),
      item("Agamemnon", { releaseYear: null, externalId: "3" }), // has art
      item("Agamemnon", { releaseYear: 2021, externalId: "4" }), // different year: kept
    ];
    const out = rankResults(items);
    expect(out.map((x) => x.externalId)).toEqual(["3", "4"]);
  });

  it("treats a different media type as a different item", () => {
    const items = [item("Dune"), item("Dune", { type: "book" })];
    expect(rankResults(items)).toHaveLength(2);
  });
});
