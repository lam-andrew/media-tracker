import type { Status } from "@/lib/constants";
import type { ImportRow } from "./types";

/**
 * Goodreads adapter: maps rows of `goodreads_library_export.csv` (already parsed
 * into header-keyed objects) to generic `ImportRow`s. Pure; no I/O.
 */

/** Header signature: enough of these present ⇒ a Goodreads export. */
export const GOODREADS_HEADERS = [
  "Book Id",
  "Title",
  "Author",
  "My Rating",
  "Exclusive Shelf",
] as const;

export function isGoodreadsHeaders(headers: string[]): boolean {
  const set = new Set(headers.map((h) => h.trim()));
  return GOODREADS_HEADERS.every((h) => set.has(h));
}

/** Goodreads exports ISBNs as spreadsheet formulas: `="9780441478125"`; empty is `=""`. */
export function cleanIsbn(raw: string | undefined): string | null {
  if (!raw) return null;
  const stripped = raw
    .trim()
    .replace(/^=/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/[-\s]/g, "");
  return /^(\d{9}[\dXx]|\d{13})$/.test(stripped)
    ? stripped.toUpperCase()
    : null;
}

/** "Eragon (The Inheritance Cycle, #1)" → "Eragon". Keeps titles like "(500) Days" intact. */
export function cleanTitle(title: string): string {
  const cleaned = title.replace(/\s*\([^()]*\)\s*$/, "").trim();
  return cleaned.length > 0 ? cleaned : title.trim();
}

const SHELF_STATUS: Record<string, Status> = {
  read: "completed",
  "currently-reading": "in_progress",
  "to-read": "backlog",
};

export function shelfToStatus(shelf: string | undefined): Status {
  return SHELF_STATUS[(shelf ?? "").trim().toLowerCase()] ?? "backlog";
}

/** "2021/03/14" → "2021-03-14"; anything unparseable → null. */
export function parseGoodreadsDate(raw: string | undefined): string | null {
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec((raw ?? "").trim());
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

/** My Rating is 0–5 integer where 0 means unrated. */
export function parseGoodreadsRating(raw: string | undefined): number | null {
  const n = Number((raw ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(5, Math.max(0.5, Math.round(n * 2) / 2));
}

/** Goodreads reviews carry `<br/>` line breaks and occasional inline HTML. */
export function cleanReview(raw: string | undefined): string | null {
  if (!raw) return null;
  const text = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, "")
    .trim();
  return text.length > 0 ? text : null;
}

function parseYear(...candidates: (string | undefined)[]): number | null {
  for (const c of candidates) {
    const n = Number((c ?? "").trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function splitAuthors(...fields: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const f of fields) {
    for (const name of (f ?? "").split(",")) {
      const n = name.trim().replace(/\s+/g, " ");
      if (n && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

export function mapGoodreadsRow(r: Record<string, string>): ImportRow | null {
  const title = (r["Title"] ?? "").trim();
  if (!title) return null;
  return {
    type: "book",
    title,
    creators: splitAuthors(r["Author"], r["Additional Authors"]),
    year: parseYear(r["Original Publication Year"], r["Year Published"]),
    isbn: cleanIsbn(r["ISBN13"]) ?? cleanIsbn(r["ISBN"]),
    rating: parseGoodreadsRating(r["My Rating"]),
    status: shelfToStatus(r["Exclusive Shelf"]),
    finishedAt: parseGoodreadsDate(r["Date Read"]),
    notes: cleanReview(r["My Review"]),
    sourceRef: (r["Book Id"] ?? "").trim() || title,
  };
}

export function parseGoodreadsRows(
  rows: Record<string, string>[],
): ImportRow[] {
  return rows.map(mapGoodreadsRow).filter((r): r is ImportRow => r !== null);
}
