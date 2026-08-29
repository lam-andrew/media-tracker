import { describe, it, expect } from "vitest";
import { mapOpenLibraryDoc } from "./openlibrary";
import { mapTmdbMovie, mapTmdbTv } from "./tmdb";
import { mapRawgGame } from "./rawg";

describe("mapOpenLibraryDoc", () => {
  it("maps a full search doc to a NormalizedItem", () => {
    const item = mapOpenLibraryDoc({
      key: "/works/OL45804W",
      title: "The Left Hand of Darkness",
      author_name: ["Ursula K. Le Guin"],
      first_publish_year: 1969,
      cover_i: 8231856,
      number_of_pages_median: 304,
      isbn: ["0441478123", "9780441478125"],
    });
    expect(item).toEqual({
      externalSource: "openlibrary",
      externalId: "/works/OL45804W",
      type: "book",
      title: "The Left Hand of Darkness",
      creators: ["Ursula K. Le Guin"],
      imageUrl: "https://covers.openlibrary.org/b/id/8231856-L.jpg",
      releaseYear: 1969,
      metadata: { pageCount: 304, isbn: "0441478123" },
    });
  });

  it("handles missing cover, authors, and year", () => {
    const item = mapOpenLibraryDoc({
      key: "/works/OL1W",
      title: "Untitled Work",
    });
    expect(item.imageUrl).toBeNull();
    expect(item.creators).toEqual([]);
    expect(item.releaseYear).toBeNull();
    expect(item.metadata).toEqual({ pageCount: null, isbn: null });
  });
});

describe("mapTmdbMovie", () => {
  it("maps a movie result, building the poster URL and year", () => {
    const item = mapTmdbMovie({
      id: 603,
      title: "The Matrix",
      release_date: "1999-03-31",
      poster_path: "/matrix.jpg",
      overview: "A hacker learns the truth.",
    });
    expect(item.externalSource).toBe("tmdb");
    expect(item.externalId).toBe("603");
    expect(item.type).toBe("movie");
    expect(item.imageUrl).toBe("https://image.tmdb.org/t/p/w500/matrix.jpg");
    expect(item.releaseYear).toBe(1999);
  });
});

describe("mapTmdbTv", () => {
  it("uses name/first_air_date and null poster", () => {
    const item = mapTmdbTv({
      id: 1396,
      name: "Breaking Bad",
      first_air_date: "2008-01-20",
      poster_path: null,
    });
    expect(item.type).toBe("tv");
    expect(item.title).toBe("Breaking Bad");
    expect(item.imageUrl).toBeNull();
    expect(item.releaseYear).toBe(2008);
  });
});

describe("mapRawgGame", () => {
  it("maps a game result and flattens platform names", () => {
    const item = mapRawgGame({
      id: 3498,
      name: "Grand Theft Auto V",
      released: "2013-09-17",
      background_image: "https://media.rawg.io/gtav.jpg",
      platforms: [
        { platform: { name: "PC" } },
        { platform: { name: "PlayStation 5" } },
      ],
      playtime: 74,
    });
    expect(item.type).toBe("game");
    expect(item.releaseYear).toBe(2013);
    expect(item.imageUrl).toBe("https://media.rawg.io/gtav.jpg");
    expect(item.metadata).toEqual({
      platforms: ["PC", "PlayStation 5"],
      playtime: 74,
    });
  });
});
