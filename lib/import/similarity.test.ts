import { describe, it, expect } from "vitest";
import { normalizeTitle, titleSimilarity } from "./similarity";

describe("normalizeTitle", () => {
  it("lowercases, strips punctuation and articles, collapses whitespace", () => {
    expect(normalizeTitle("The  Lord of the Rings: The Fellowship!")).toBe(
      "lord of rings fellowship",
    );
  });

  it("strips diacritics", () => {
    expect(normalizeTitle("Amélie")).toBe("amelie");
  });

  it("returns empty string for punctuation-only input", () => {
    expect(normalizeTitle("...")).toBe("");
  });
});

describe("titleSimilarity", () => {
  it("returns 1 for identical titles regardless of case/punctuation", () => {
    expect(titleSimilarity("Dune", "DUNE!")).toBe(1);
  });

  it("ignores leading articles", () => {
    expect(titleSimilarity("The Hobbit", "Hobbit")).toBe(1);
  });

  it("returns 0 for disjoint titles", () => {
    expect(titleSimilarity("Dune", "Emma")).toBe(0);
  });

  it("returns a partial score for overlapping titles", () => {
    const s = titleSimilarity("Eragon", "Eragon Inheritance Cycle 1");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
    expect(s).toBeCloseTo(0.4, 5);
  });

  it("treats two empty titles as identical and one empty as disjoint", () => {
    expect(titleSimilarity("", "")).toBe(1);
    expect(titleSimilarity("Dune", "")).toBe(0);
  });
});
