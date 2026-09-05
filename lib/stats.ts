import { createClient } from "@/lib/supabase/server";
import { STATUSES, type Status } from "@/lib/constants";
import { MEDIA_TYPES } from "@/lib/media-config";

/**
 * Cross-media stats. `getStats` fetches the signed-in user's tracking rows (RLS
 * scopes them) and hands them to `computeStats`, which is pure and unit-tested.
 * Media types are never hardcoded here: every per-type breakdown is seeded from
 * `MEDIA_TYPES`, so a new type appears in the stats the moment it's configured.
 */

/** The minimal row shape the stats need — matches the `getStats` select. */
export interface StatsRow {
  status: string;
  rating: number | string | null;
  created_at: string;
  finished_at: string | null;
  media_items: {
    type: string;
    metadata: Record<string, unknown> | null;
  } | null;
}

export interface MonthBucket {
  month: string; // "2026-03"
  label: string; // "Mar"
  count: number;
}

export interface Stats {
  totalItems: number;
  totalsByType: Record<string, number>;
  totalsByStatus: Record<string, number>;
  byTypeAndStatus: Record<string, Record<string, number>>;
  completedThisYear: { total: number; byType: Record<string, number> };
  averageRating: number | null;
  ratingHistogram: { rating: number; count: number }[];
  completionsByMonth: MonthBucket[];
  topGenres: { genre: string; count: number }[];
}

const MONTH_LABELS = [
  "Jan",
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
];

/** All half-star buckets, 0.5 through 5.0. */
export const RATING_BUCKETS = Array.from({ length: 10 }, (_, i) => (i + 1) / 2);

/**
 * "YYYY-MM" for a stored date. `finished_at` is a plain `date` ("2026-03-14")
 * and `created_at` a timestamptz — reading the leading "YYYY-MM" avoids shifting
 * a date across a month boundary through the server's timezone.
 */
function yearMonthOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})/.exec(value);
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function zeroByType(): Record<string, number> {
  return Object.fromEntries(MEDIA_TYPES.map((t) => [t.type, 0]));
}

function zeroByStatus(): Record<string, number> {
  return Object.fromEntries(STATUSES.map((s) => [s, 0]));
}

/** The date a completion counts under: finished_at, else created_at. */
export function completionDate(row: StatsRow): string | null {
  return yearMonthOf(row.finished_at) ?? yearMonthOf(row.created_at);
}

/** Pure: turn raw tracking rows into every number the Stats page shows. */
export function computeStats(rows: StatsRow[], now: Date): Stats {
  const totalsByType = zeroByType();
  const totalsByStatus = zeroByStatus();
  const byTypeAndStatus: Record<
    string,
    Record<string, number>
  > = Object.fromEntries(MEDIA_TYPES.map((t) => [t.type, zeroByStatus()]));
  const completedByType = zeroByType();
  let completedTotal = 0;

  const currentYear = String(now.getFullYear());
  const ratings: number[] = [];
  const histogram = new Map<number, number>(RATING_BUCKETS.map((r) => [r, 0]));

  // Last 12 months ending at `now`'s month, oldest first.
  const monthBuckets: MonthBucket[] = [];
  const monthIndex = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthIndex.set(key, monthBuckets.length);
    monthBuckets.push({
      month: key,
      label: MONTH_LABELS[d.getMonth()],
      count: 0,
    });
  }

  const genreCounts = new Map<string, number>();

  for (const row of rows) {
    if (!row.media_items) continue;
    const type = row.media_items.type;
    const status = row.status;

    totalsByType[type] = (totalsByType[type] ?? 0) + 1;
    totalsByStatus[status] = (totalsByStatus[status] ?? 0) + 1;
    byTypeAndStatus[type] ??= zeroByStatus();
    byTypeAndStatus[type][status] = (byTypeAndStatus[type][status] ?? 0) + 1;

    if (status === ("completed" satisfies Status)) {
      const when = completionDate(row);
      if (when) {
        if (when.startsWith(`${currentYear}-`)) {
          completedTotal += 1;
          completedByType[type] = (completedByType[type] ?? 0) + 1;
        }
        const idx = monthIndex.get(when);
        if (idx !== undefined) monthBuckets[idx].count += 1;
      }
    }

    const rating = row.rating === null ? null : Number(row.rating);
    if (rating !== null && Number.isFinite(rating)) {
      ratings.push(rating);
      const bucket = Math.round(rating * 2) / 2;
      if (histogram.has(bucket))
        histogram.set(bucket, histogram.get(bucket)! + 1);
    }

    const genres = row.media_items.metadata?.genres;
    if (Array.isArray(genres)) {
      for (const g of genres) {
        if (typeof g !== "string") continue;
        const name = g.trim();
        if (!name) continue;
        genreCounts.set(name, (genreCounts.get(name) ?? 0) + 1);
      }
    }
  }

  const averageRating =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10;

  const topGenres = [...genreCounts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
    .slice(0, 8);

  return {
    totalItems: rows.filter((r) => r.media_items).length,
    totalsByType,
    totalsByStatus,
    byTypeAndStatus,
    completedThisYear: { total: completedTotal, byType: completedByType },
    averageRating,
    ratingHistogram: RATING_BUCKETS.map((rating) => ({
      rating,
      count: histogram.get(rating) ?? 0,
    })),
    completionsByMonth: monthBuckets,
    topGenres,
  };
}

/** Fetch the signed-in user's tracking rows (RLS scopes them) and compute stats. */
export async function getStats(now: Date = new Date()): Promise<Stats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_items")
    .select(
      "status, rating, created_at, finished_at, media_items(type, metadata)",
    );

  if (error) throw new Error(error.message);
  return computeStats((data as unknown as StatsRow[] | null) ?? [], now);
}
