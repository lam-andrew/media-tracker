import { describe, it, expect } from "vitest";
import { parseCsv, rowsToObjects } from "./csv";
import {
  cleanIsbn,
  cleanReview,
  cleanTitle,
  parseGoodreadsDate,
  parseGoodreadsRating,
  parseGoodreadsRows,
  shelfToStatus,
} from "./goodreads";

const HEADER =
  "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies";

const FIXTURE = [
  HEADER,
  `113436,"Eragon (The Inheritance Cycle, #1)",Christopher Paolini,"Paolini, Christopher",,"=""0375826696""","=""9780375826696""",4,3.93,Knopf,Hardcover,503,2005,2002,2021/03/14,2021/01/02,fantasy,fantasy (#1),read,"Loved it.<br/>Would read again <b>twice</b>.",,,1,0`,
  `234225,Dune,Frank Herbert,"Herbert, Frank",,"=""""","=""""",0,4.25,Ace,Paperback,604,1990,1965,,2021/01/02,,,to-read,,,,0,0`,
  `41865,Twilight,Stephenie Meyer,"Meyer, Stephenie","Foo Bar, Baz Qux",,,3,3.60,Little Brown,Paperback,498,2006,2005,,2021/01/02,currently-reading,currently-reading (#1),currently-reading,,,,0,0`,
  `1,Odd Shelf Book,Someone,"Someone",,,,5,4.0,,,100,,,2020/1/5,,,,favorites,,,,1,0`,
].join("\n");

function rows() {
  return parseGoodreadsRows(rowsToObjects(parseCsv(FIXTURE)));
}

describe("Goodreads adapter", () => {
  it("maps a full export row", () => {
    const [eragon] = rows();
    expect(eragon).toEqual({
      type: "book",
      title: "Eragon (The Inheritance Cycle, #1)",
      creators: ["Christopher Paolini"],
      year: 2002,
      isbn: "9780375826696",
      rating: 4,
      status: "completed",
      finishedAt: "2021-03-14",
      notes: "Loved it.\nWould read again twice.",
      sourceRef: "113436",
    });
  });

  it("treats empty ISBN formulas and rating 0 as null, and maps to-read → backlog", () => {
    const dune = rows()[1];
    expect(dune.isbn).toBeNull();
    expect(dune.rating).toBeNull();
    expect(dune.status).toBe("backlog");
    expect(dune.finishedAt).toBeNull();
    expect(dune.notes).toBeNull();
    expect(dune.year).toBe(1965);
  });

  it("merges additional authors and maps currently-reading → in_progress", () => {
    const twilight = rows()[2];
    expect(twilight.creators).toEqual([
      "Stephenie Meyer",
      "Foo Bar",
      "Baz Qux",
    ]);
    expect(twilight.status).toBe("in_progress");
  });

  it("maps unknown shelves to backlog and pads single-digit dates", () => {
    const odd = rows()[3];
    expect(odd.status).toBe("backlog");
    expect(odd.finishedAt).toBe("2020-01-05");
    expect(odd.year).toBeNull();
  });

  it("skips rows without a title", () => {
    expect(parseGoodreadsRows([{ Title: "  ", Author: "x" }])).toEqual([]);
  });
});

describe("cleanIsbn", () => {
  it("strips the formula wrapper", () => {
    expect(cleanIsbn('="9780441478125"')).toBe("9780441478125");
    expect(cleanIsbn('="0441478123"')).toBe("0441478123");
  });
  it("returns null for the empty formula, blanks, and junk", () => {
    expect(cleanIsbn('=""')).toBeNull();
    expect(cleanIsbn("")).toBeNull();
    expect(cleanIsbn(undefined)).toBeNull();
    expect(cleanIsbn("not-an-isbn")).toBeNull();
  });
  it("accepts plain ISBNs with hyphens and a trailing X", () => {
    expect(cleanIsbn("978-0-441-47812-5")).toBe("9780441478125");
    expect(cleanIsbn("044147812x")).toBe("044147812X");
  });
});

describe("cleanTitle", () => {
  it("strips a trailing series parenthetical", () => {
    expect(cleanTitle("Eragon (The Inheritance Cycle, #1)")).toBe("Eragon");
  });
  it("leaves titles without a trailing parenthetical alone", () => {
    expect(cleanTitle("(500) Days of Summer")).toBe("(500) Days of Summer");
    expect(cleanTitle("Dune")).toBe("Dune");
  });
  it("falls back to the original when everything would be stripped", () => {
    expect(cleanTitle("(Untitled)")).toBe("(Untitled)");
  });
});

describe("shelfToStatus / rating / date / review helpers", () => {
  it("maps shelves", () => {
    expect(shelfToStatus("read")).toBe("completed");
    expect(shelfToStatus("currently-reading")).toBe("in_progress");
    expect(shelfToStatus("to-read")).toBe("backlog");
    expect(shelfToStatus("abandoned")).toBe("backlog");
    expect(shelfToStatus(undefined)).toBe("backlog");
  });
  it("parses ratings", () => {
    expect(parseGoodreadsRating("0")).toBeNull();
    expect(parseGoodreadsRating("")).toBeNull();
    expect(parseGoodreadsRating("5")).toBe(5);
    expect(parseGoodreadsRating("3")).toBe(3);
  });
  it("parses dates", () => {
    expect(parseGoodreadsDate("2021/03/14")).toBe("2021-03-14");
    expect(parseGoodreadsDate("")).toBeNull();
    expect(parseGoodreadsDate("March 14")).toBeNull();
  });
  it("cleans reviews", () => {
    expect(cleanReview("a<br>b<br/>c<br />d")).toBe("a\nb\nc\nd");
    expect(cleanReview("<i>x</i> &amp; y")).toBe("x & y");
    expect(cleanReview("   ")).toBeNull();
  });
});
