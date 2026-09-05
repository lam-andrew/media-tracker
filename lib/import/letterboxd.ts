import type { ImportRow } from "./types";

/**
 * Letterboxd adapter: maps rows of `watched.csv`, `ratings.csv`, or `diary.csv`
 * (from the export zip) to generic `ImportRow`s. Every row is a completed movie.
 * Pure; no I/O.
 */

/** Header signature shared by every Letterboxd export file. */
export const LETTERBOXD_HEADERS = [
  "Date",
  "Name",
  "Year",
  "Letterboxd URI",
] as const;

export function isLetterboxdHeaders(headers: string[]): boolean {
  const set = new Set(headers.map((h) => h.trim()));
  return LETTERBOXD_HEADERS.every((h) => set.has(h));
}

/** Letterboxd ratings are already 0.5–5 in half steps; empty means unrated. */
export function parseLetterboxdRating(raw: string | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2));
}

/** "2021-03-14" → "2021-03-14"; anything unparseable → null. */
export function parseLetterboxdDate(raw: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((raw ?? "").trim());
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export function mapLetterboxdRow(r: Record<string, string>): ImportRow | null {
  const title = (r["Name"] ?? "").trim();
  if (!title) return null;
  const year = Number((r["Year"] ?? "").trim());
  const review = (r["Review"] ?? "").trim();
  return {
    type: "movie",
    title,
    creators: [],
    year: Number.isInteger(year) && year > 0 ? year : null,
    isbn: null,
    rating: parseLetterboxdRating(r["Rating"]),
    status: "completed",
    finishedAt:
      parseLetterboxdDate(r["Watched Date"]) ?? parseLetterboxdDate(r["Date"]),
    notes: review.length > 0 ? review : null,
    sourceRef: (r["Letterboxd URI"] ?? "").trim() || title,
  };
}

/**
 * Map rows and collapse duplicates (diary rewatches share a URI): keep one row
 * per URI with the latest date and the last non-empty rating/notes seen.
 */
export function parseLetterboxdRows(
  rows: Record<string, string>[],
): ImportRow[] {
  const byRef = new Map<string, ImportRow>();
  for (const raw of rows) {
    const row = mapLetterboxdRow(raw);
    if (!row) continue;
    const prev = byRef.get(row.sourceRef);
    if (!prev) {
      byRef.set(row.sourceRef, row);
      continue;
    }
    const later =
      (row.finishedAt ?? "") >= (prev.finishedAt ?? "")
        ? row.finishedAt
        : prev.finishedAt;
    byRef.set(row.sourceRef, {
      ...prev,
      finishedAt: later ?? null,
      rating: row.rating ?? prev.rating,
      notes: row.notes ?? prev.notes,
    });
  }
  return [...byRef.values()];
}
