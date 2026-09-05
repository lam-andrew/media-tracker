import type { Status } from "@/lib/constants";
import type { NormalizedItem } from "@/lib/providers/types";

/** Where a CSV export came from. Each source has its own adapter in lib/import. */
export type ImportSource = "goodreads" | "letterboxd";

/**
 * One row of a parsed export, normalized across sources. The adapter decides the
 * media `type` (a source inherently implies it); everything downstream is generic.
 */
export interface ImportRow {
  type: string; // "book" | "movie" (from the source)
  title: string;
  creators: string[]; // author(s) for books; empty for Letterboxd
  year: number | null;
  isbn: string | null; // books only
  rating: number | null; // 0.5–5 in 0.5 steps; null when unrated
  status: Status;
  finishedAt: string | null; // ISO date "YYYY-MM-DD"
  notes: string | null;
  sourceRef: string; // e.g. Goodreads Book Id or Letterboxd URI — for dedupe/display
}

/** A matched row the user chose to import, ready for commitImport. */
export interface ImportEntry {
  item: NormalizedItem;
  status: Status;
  rating: number | null;
  finishedAt: string | null;
  notes: string | null;
}

/** Rows per matchImportRows call — keeps server-action payloads small. */
export const MATCH_BATCH_CAP = 25;
/** Rows the wizard sends per match call (progress granularity). */
export const MATCH_CHUNK = 10;
/** Entries per commitImport call. */
export const COMMIT_BATCH_CAP = 200;
/** Entries the wizard sends per commit call. */
export const COMMIT_CHUNK = 50;

export const IMPORT_SOURCES: { key: ImportSource; label: string }[] = [
  { key: "goodreads", label: "Goodreads" },
  { key: "letterboxd", label: "Letterboxd" },
];

export function sourceLabel(source: ImportSource): string {
  return IMPORT_SOURCES.find((s) => s.key === source)?.label ?? source;
}
