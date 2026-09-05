import { describe, it, expect } from "vitest";
import { goalProgress, isMissingTableError } from "./goals";
import { computeStats } from "./stats";

describe("isMissingTableError", () => {
  it("recognises the Postgres and PostgREST 'table missing' signals", () => {
    expect(isMissingTableError({ code: "42P01", message: "" })).toBe(true);
    expect(
      isMissingTableError({
        code: "PGRST205",
        message:
          "Could not find the table 'public.user_goals' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingTableError({
        message: 'relation "public.user_goals" does not exist',
      }),
    ).toBe(true);
  });

  it("does not swallow other errors", () => {
    expect(
      isMissingTableError({ code: "42501", message: "permission denied" }),
    ).toBe(false);
    expect(isMissingTableError({})).toBe(false);
  });
});

describe("goalProgress", () => {
  const now = new Date(2026, 8, 5);
  const stats = computeStats(
    [
      {
        status: "completed",
        rating: null,
        created_at: "2026-01-01T00:00:00Z",
        finished_at: "2026-03-03",
        media_items: { type: "book", metadata: {} },
      },
      {
        status: "completed",
        rating: null,
        created_at: "2026-01-01T00:00:00Z",
        finished_at: "2026-04-04",
        media_items: { type: "movie", metadata: {} },
      },
    ],
    now,
  );

  it("counts all media for a type-less goal", () => {
    expect(goalProgress({ type: null }, stats)).toBe(2);
  });

  it("counts one type for a typed goal, and zero for an unknown type", () => {
    expect(goalProgress({ type: "book" }, stats)).toBe(1);
    expect(goalProgress({ type: "podcast" }, stats)).toBe(0);
  });
});
