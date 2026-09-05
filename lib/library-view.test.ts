import { describe, it, expect } from "vitest";
import type { LibraryItem } from "./queries";
import {
  sortLibrary,
  filterLibrary,
  libraryHref,
  isLibrarySort,
} from "./library-view";

let n = 0;
function mk(over: Partial<LibraryItem>): LibraryItem {
  n += 1;
  return {
    id: `u${n}`,
    status: "backlog",
    rating: null,
    favorite: false,
    mediaItemId: `m${n}`,
    type: "book",
    title: `Title ${n}`,
    imageUrl: null,
    releaseYear: null,
    creators: [],
    ...over,
  };
}

const titles = (xs: LibraryItem[]) => xs.map((x) => x.title);

describe("sortLibrary", () => {
  it("'added' keeps the incoming (newest-first) order", () => {
    const items = [mk({ title: "c" }), mk({ title: "a" }), mk({ title: "b" })];
    expect(titles(sortLibrary(items, "added"))).toEqual(["c", "a", "b"]);
    // and does not mutate the input
    expect(titles(items)).toEqual(["c", "a", "b"]);
  });

  it("'rating' is descending with unrated last, ties in added order", () => {
    const items = [
      mk({ title: "unrated-1" }),
      mk({ title: "four", rating: 4 }),
      mk({ title: "five", rating: 5 }),
      mk({ title: "unrated-2" }),
      mk({ title: "four-later", rating: 4 }),
    ];
    expect(titles(sortLibrary(items, "rating"))).toEqual([
      "five",
      "four",
      "four-later",
      "unrated-1",
      "unrated-2",
    ]);
  });

  it("'title' is case-insensitive A–Z", () => {
    const items = [
      mk({ title: "banana" }),
      mk({ title: "Apple" }),
      mk({ title: "cherry" }),
    ];
    expect(titles(sortLibrary(items, "title"))).toEqual([
      "Apple",
      "banana",
      "cherry",
    ]);
  });

  it("'year' is newest first, unknown years last, then by title", () => {
    const items = [
      mk({ title: "old", releaseYear: 1999 }),
      mk({ title: "unknown-b" }),
      mk({ title: "new-b", releaseYear: 2024 }),
      mk({ title: "new-a", releaseYear: 2024 }),
      mk({ title: "unknown-a" }),
    ];
    expect(titles(sortLibrary(items, "year"))).toEqual([
      "new-a",
      "new-b",
      "old",
      "unknown-a",
      "unknown-b",
    ]);
  });
});

describe("filterLibrary", () => {
  const items = [
    mk({ title: "Dune", creators: ["Frank Herbert"] }),
    mk({ title: "Alien", creators: ["Ridley Scott"] }),
    mk({ title: "The Left Hand of Darkness", creators: ["Ursula K. Le Guin"] }),
  ];

  it("returns everything for an empty/whitespace query", () => {
    expect(filterLibrary(items, "")).toBe(items);
    expect(filterLibrary(items, "   ")).toBe(items);
  });

  it("matches title or creator, case-insensitively", () => {
    expect(titles(filterLibrary(items, "dune"))).toEqual(["Dune"]);
    expect(titles(filterLibrary(items, "le guin"))).toEqual([
      "The Left Hand of Darkness",
    ]);
    expect(titles(filterLibrary(items, "SCOTT"))).toEqual(["Alien"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterLibrary(items, "zzz")).toEqual([]);
  });
});

describe("libraryHref", () => {
  it("omits defaults so the bare path stays canonical", () => {
    expect(libraryHref("/library", {})).toBe("/library");
    expect(libraryHref("/library", { sort: "added" })).toBe("/library");
  });

  it("includes set params in a stable order", () => {
    expect(
      libraryHref("/library", {
        type: "book",
        status: "completed",
        sort: "rating",
      }),
    ).toBe("/library?type=book&status=completed&sort=rating");
    expect(libraryHref("/favorites", { sort: "title" })).toBe(
      "/favorites?sort=title",
    );
  });
});

describe("isLibrarySort", () => {
  it("accepts known sorts and rejects junk", () => {
    expect(isLibrarySort("rating")).toBe(true);
    expect(isLibrarySort("bogus")).toBe(false);
    expect(isLibrarySort(undefined)).toBe(false);
  });
});
