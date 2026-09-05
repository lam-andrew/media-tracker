import { describe, it, expect } from "vitest";
import { computeStats, RATING_BUCKETS, type StatsRow } from "./stats";
import { MEDIA_TYPES } from "./media-config";
import { STATUSES } from "./constants";

function row(partial: Partial<StatsRow> & { type?: string }): StatsRow {
  const { type = "book", ...rest } = partial;
  return {
    status: "backlog",
    rating: null,
    created_at: "2026-05-01T12:00:00Z",
    finished_at: null,
    media_items: { type, metadata: {} },
    ...rest,
  };
}

const NOW = new Date(2026, 8, 5); // 5 Sep 2026, local time

describe("computeStats", () => {
  it("returns zeroed, fully-shaped output for an empty library", () => {
    const s = computeStats([], NOW);
    expect(s.totalItems).toBe(0);
    for (const t of MEDIA_TYPES) {
      expect(s.totalsByType[t.type]).toBe(0);
      expect(s.completedThisYear.byType[t.type]).toBe(0);
      for (const st of STATUSES) expect(s.byTypeAndStatus[t.type][st]).toBe(0);
    }
    for (const st of STATUSES) expect(s.totalsByStatus[st]).toBe(0);
    expect(s.completedThisYear.total).toBe(0);
    expect(s.averageRating).toBeNull();
    expect(s.ratingHistogram).toHaveLength(10);
    expect(s.ratingHistogram.every((b) => b.count === 0)).toBe(true);
    expect(s.completionsByMonth).toHaveLength(12);
    expect(s.completionsByMonth.every((m) => m.count === 0)).toBe(true);
    expect(s.topGenres).toEqual([]);
  });

  it("counts mixed types and statuses, skipping rows without media", () => {
    const s = computeStats(
      [
        row({ type: "book", status: "completed", finished_at: "2026-02-10" }),
        row({ type: "book", status: "in_progress" }),
        row({ type: "movie", status: "completed", finished_at: "2026-03-01" }),
        row({ type: "game", status: "abandoned" }),
        row({ type: "tv", status: "backlog" }),
        { ...row({}), media_items: null },
      ],
      NOW,
    );
    expect(s.totalItems).toBe(5);
    expect(s.totalsByType).toMatchObject({ book: 2, movie: 1, tv: 1, game: 1 });
    expect(s.totalsByStatus).toEqual({
      backlog: 1,
      in_progress: 1,
      completed: 2,
      abandoned: 1,
    });
    expect(s.byTypeAndStatus.book).toEqual({
      backlog: 0,
      in_progress: 1,
      completed: 1,
      abandoned: 0,
    });
    expect(s.completedThisYear).toEqual({
      total: 2,
      byType: { book: 1, movie: 1, tv: 0, game: 0 },
    });
  });

  it("respects the year boundary (Dec 31 counts, Jan 1 of next year does not)", () => {
    const now = new Date(2026, 11, 31);
    const s = computeStats(
      [
        row({ status: "completed", finished_at: "2026-12-31" }),
        row({ status: "completed", finished_at: "2027-01-01" }),
        row({ status: "completed", finished_at: "2025-12-31" }),
        row({ status: "completed", finished_at: "2026-01-01" }),
      ],
      now,
    );
    expect(s.completedThisYear.total).toBe(2);
  });

  it("falls back to created_at when a completed item has no finished_at", () => {
    const s = computeStats(
      [
        row({
          status: "completed",
          finished_at: null,
          created_at: "2026-04-20T08:00:00Z",
        }),
        row({
          status: "completed",
          finished_at: null,
          created_at: "2024-04-20T08:00:00Z",
        }),
        // Not completed: never counts, whatever the dates say.
        row({ status: "in_progress", finished_at: "2026-04-20" }),
      ],
      NOW,
    );
    expect(s.completedThisYear.total).toBe(1);
    expect(s.completionsByMonth.find((m) => m.month === "2026-04")?.count).toBe(
      1,
    );
  });

  it("averages ratings to one decimal and fills all ten histogram buckets", () => {
    const s = computeStats(
      [
        row({ rating: 4.5 }),
        row({ rating: 4.5 }),
        row({ rating: 3 }),
        row({ rating: "2.5" }), // numeric columns may arrive as strings
        row({ rating: null }),
      ],
      NOW,
    );
    expect(s.averageRating).toBe(3.6); // 14.5 / 4 = 3.625
    expect(s.ratingHistogram.map((b) => b.rating)).toEqual(RATING_BUCKETS);
    expect(s.ratingHistogram.map((b) => b.rating)).toEqual([
      0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
    ]);
    const counts = Object.fromEntries(
      s.ratingHistogram.map((b) => [b.rating, b.count]),
    );
    expect(counts).toEqual({
      0.5: 0,
      1: 0,
      1.5: 0,
      2: 0,
      2.5: 1,
      3: 1,
      3.5: 0,
      4: 0,
      4.5: 2,
      5: 0,
    });
  });

  it("builds the trailing 12 months with zeros, ending at now's month", () => {
    const s = computeStats(
      [
        row({ status: "completed", finished_at: "2026-09-01" }),
        row({ status: "completed", finished_at: "2026-09-30" }),
        row({ status: "completed", finished_at: "2025-10-15" }), // oldest in window
        row({ status: "completed", finished_at: "2025-09-15" }), // just outside
        row({ status: "completed", finished_at: "2026-10-01" }), // future, outside
      ],
      NOW,
    );
    expect(s.completionsByMonth.map((m) => m.month)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
    expect(s.completionsByMonth[0]).toEqual({
      month: "2025-10",
      label: "Oct",
      count: 1,
    });
    expect(s.completionsByMonth[11]).toEqual({
      month: "2026-09",
      label: "Sep",
      count: 2,
    });
    expect(s.completionsByMonth.slice(1, 11).every((m) => m.count === 0)).toBe(
      true,
    );
  });

  it("wraps the 12-month window across a year boundary", () => {
    const s = computeStats([], new Date(2026, 0, 15)); // Jan 2026
    expect(s.completionsByMonth[0].month).toBe("2025-02");
    expect(s.completionsByMonth[11].month).toBe("2026-01");
    expect(s.completionsByMonth.map((m) => m.label)).toEqual([
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
    ]);
  });

  it("counts genres, ignores junk, and keeps the top 8", () => {
    const genres = (g: unknown) =>
      row({ media_items: { type: "book", metadata: { genres: g } } });
    const rows: StatsRow[] = [
      genres(["Fantasy", "Sci-Fi", 42, null, "", "  "]),
      genres(["Fantasy", { name: "Horror" }]),
      genres("Fantasy"), // not an array
      genres(undefined),
      // Seven singletons that sort after "Sci-Fi" on the alphabetical tie-break.
      ...["t", "u", "v", "w", "x", "y", "z"].map((g) => genres([g])),
    ];
    const s = computeStats(rows, NOW);
    expect(s.topGenres).toHaveLength(8);
    expect(s.topGenres[0]).toEqual({ genre: "Fantasy", count: 2 });
    expect(s.topGenres[1]).toEqual({ genre: "Sci-Fi", count: 1 });
    expect(s.topGenres.some((g) => g.genre === "z")).toBe(false); // 9th
    expect(s.topGenres.some((g) => g.genre === "Horror")).toBe(false);
  });

  it("still counts an item whose type is not (yet) in MEDIA_TYPES", () => {
    const s = computeStats(
      [
        row({
          type: "podcast",
          status: "completed",
          finished_at: "2026-06-06",
        }),
      ],
      NOW,
    );
    expect(s.totalsByType.podcast).toBe(1);
    expect(s.byTypeAndStatus.podcast.completed).toBe(1);
    expect(s.completedThisYear.byType.podcast).toBe(1);
  });
});
