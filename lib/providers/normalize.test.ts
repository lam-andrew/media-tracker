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
