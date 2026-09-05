import { describe, it, expect } from "vitest";
import { parseCsv, rowsToObjects } from "./csv";
import { detectSource, parseImportFile, toImportRows } from "./index";
import { parseLetterboxdRating, parseLetterboxdRows } from "./letterboxd";

const DIARY = [
  "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date",
  "2023-01-05,Dune,2021,https://boxd.it/abc,4,,,2023-01-04",
  "2023-06-10,Dune,2021,https://boxd.it/abc,,Yes,,2023-06-09",
  "2022-11-01,Amélie,2001,https://boxd.it/def,4.5,,,2022-10-31",
].join("\n");

const WATCHED = [
  "Date,Name,Year,Letterboxd URI",
  "2021-02-03,Heat,1995,https://boxd.it/ghi",
  "2021-02-04,,1995,https://boxd.it/skip",
].join("\n");

describe("Letterboxd adapter", () => {
  it("maps diary rows to completed movies", () => {
    const rows = parseLetterboxdRows(rowsToObjects(parseCsv(DIARY)));
    const amelie = rows.find((r) => r.title === "Amélie");
    expect(amelie).toEqual({
      type: "movie",
      title: "Amélie",
      creators: [],
      year: 2001,
      isbn: null,
      rating: 4.5,
      status: "completed",
      finishedAt: "2022-10-31",
      notes: null,
      sourceRef: "https://boxd.it/def",
    });
  });

  it("collapses rewatches: latest date, last non-empty rating", () => {
    const rows = parseLetterboxdRows(rowsToObjects(parseCsv(DIARY)));
    expect(rows).toHaveLength(2);
    const dune = rows.find((r) => r.title === "Dune")!;
    expect(dune.finishedAt).toBe("2023-06-09");
    expect(dune.rating).toBe(4);
  });

  it("uses Date when there is no Watched Date, and skips untitled rows", () => {
    const rows = parseLetterboxdRows(rowsToObjects(parseCsv(WATCHED)));
    expect(rows).toHaveLength(1);
    expect(rows[0].finishedAt).toBe("2021-02-03");
    expect(rows[0].rating).toBeNull();
  });

  it("parses ratings in half steps and treats empty as null", () => {
    expect(parseLetterboxdRating("")).toBeNull();
    expect(parseLetterboxdRating("0")).toBeNull();
    expect(parseLetterboxdRating("3.5")).toBe(3.5);
    expect(parseLetterboxdRating("5")).toBe(5);
  });
});

describe("detectSource / parseImportFile", () => {
  it("detects Letterboxd and Goodreads by header signature", () => {
    expect(
      detectSource(["Date", "Name", "Year", "Letterboxd URI", "Rating"]),
    ).toBe("letterboxd");
    expect(
      detectSource([
        "Book Id",
        "Title",
        "Author",
        "ISBN",
        "My Rating",
        "Exclusive Shelf",
      ]),
    ).toBe("goodreads");
  });

  it("returns null for unknown headers", () => {
    expect(detectSource(["foo", "bar"])).toBeNull();
    expect(detectSource([])).toBeNull();
  });

  it("parses a file end to end", () => {
    const parsed = parseImportFile(WATCHED);
    expect(parsed.detected).toBe("letterboxd");
    expect(parsed.objects).toHaveLength(2);
    expect(toImportRows("letterboxd", parsed.objects)).toHaveLength(1);
  });
});
