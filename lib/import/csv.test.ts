import { describe, it, expect } from "vitest";
import { parseCsv, rowsToObjects } from "./csv";

describe("parseCsv", () => {
  it("parses simple rows with LF line endings", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("parses CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("handles quoted fields with commas", () => {
    expect(parseCsv('title,author\n"Eragon (Cycle, #1)",Paolini')).toEqual([
      ["title", "author"],
      ["Eragon (Cycle, #1)", "Paolini"],
    ]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    expect(parseCsv('"She said ""hi""",x')).toEqual([['She said "hi"', "x"]]);
  });

  it("keeps newlines embedded in quoted fields", () => {
    expect(parseCsv('"line one\nline two",b\nc,d')).toEqual([
      ["line one\nline two", "b"],
      ["c", "d"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    expect(parseCsv("\uFEFFa,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("drops a trailing empty line and blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("preserves empty fields", () => {
    expect(parseCsv("a,,c\n,,")).toEqual([
      ["a", "", "c"],
      ["", "", ""],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });

  it("handles the Goodreads formula-style ISBN quirk verbatim", () => {
    // Goodreads exports ISBNs as ="9780441478125" (a spreadsheet formula).
    expect(parseCsv('ISBN\n"=""9780441478125"""')).toEqual([
      ["ISBN"],
      ['="9780441478125"'],
    ]);
  });
});

describe("rowsToObjects", () => {
  it("maps rows to objects keyed by trimmed headers", () => {
    expect(
      rowsToObjects([
        [" Title ", "Year"],
        ["Dune", "1965"],
      ]),
    ).toEqual([{ Title: "Dune", Year: "1965" }]);
  });

  it("fills missing trailing cells with empty strings", () => {
    expect(rowsToObjects([["a", "b", "c"], ["1"]])).toEqual([
      { a: "1", b: "", c: "" },
    ]);
  });

  it("returns [] when there are no rows", () => {
    expect(rowsToObjects([])).toEqual([]);
  });
});
