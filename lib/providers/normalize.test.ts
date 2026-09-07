import { describe, it, expect } from "vitest";
import { yearFrom } from "./normalize";

describe("yearFrom", () => {
  it("extracts the year from an ISO date", () => {
    expect(yearFrom("2021-10-01")).toBe(2021);
  });

  it("extracts the year from a year-only string", () => {
    expect(yearFrom("1998")).toBe(1998);
  });

  it("returns null for empty, nullish, or malformed input", () => {
    expect(yearFrom("")).toBeNull();
    expect(yearFrom(null)).toBeNull();
    expect(yearFrom(undefined)).toBeNull();
    expect(yearFrom("n/a")).toBeNull();
  });
});

describe("mergeEnrichment", () => {
  const base = {
    externalSource: "rawg",
    externalId: "1",
    type: "game",
    title: "GTA V",
    creators: [] as string[],
    imageUrl: "https://media.rawg.io/shot.jpg",
    releaseYear: 2013,
    metadata: { platforms: ["PC"], popularity: 5 },
  };

  it("takes creators, art and metadata from the detail lookup", async () => {
    const { mergeEnrichment } = await import("./normalize");
    const out = mergeEnrichment(base, {
      ...base,
      creators: ["Rockstar North"],
      imageUrl: "https://cdn.cloudflare.steamstatic.com/x.jpg",
      metadata: { description: "…", developers: ["Rockstar North"] },
    });
    expect(out.creators).toEqual(["Rockstar North"]);
    expect(out.imageUrl).toContain("steamstatic");
    expect(out.metadata).toEqual({
      platforms: ["PC"],
      popularity: 5,
      description: "…",
      developers: ["Rockstar North"],
    });
  });

  it("keeps the stub when the lookup failed or was thinner", async () => {
    const { mergeEnrichment } = await import("./normalize");
    expect(mergeEnrichment(base, null)).toBe(base);
    const out = mergeEnrichment(base, {
      ...base,
      creators: [],
      imageUrl: null,
    });
    expect(out.creators).toEqual([]);
    expect(out.imageUrl).toBe(base.imageUrl);
  });
});
