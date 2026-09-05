import { parseCsv, rowsToObjects } from "./csv";
import { isGoodreadsHeaders, parseGoodreadsRows } from "./goodreads";
import { isLetterboxdHeaders, parseLetterboxdRows } from "./letterboxd";
import type { ImportRow, ImportSource } from "./types";

/** Pick the source adapter from a CSV's header row, or null when unrecognized. */
export function detectSource(headers: string[]): ImportSource | null {
  if (isGoodreadsHeaders(headers)) return "goodreads";
  if (isLetterboxdHeaders(headers)) return "letterboxd";
  return null;
}

const ADAPTERS: Record<
  ImportSource,
  (rows: Record<string, string>[]) => ImportRow[]
> = {
  goodreads: parseGoodreadsRows,
  letterboxd: parseLetterboxdRows,
};

export interface ParsedImport {
  headers: string[];
  detected: ImportSource | null;
  objects: Record<string, string>[];
}

/** Parse CSV text once; the caller can then pick (or override) the source. */
export function parseImportFile(text: string): ParsedImport {
  const rows = parseCsv(text);
  const headers = rows[0]?.map((h) => h.trim()) ?? [];
  return {
    headers,
    detected: detectSource(headers),
    objects: rowsToObjects(rows),
  };
}

/** Run the chosen adapter over header-keyed rows. */
export function toImportRows(
  source: ImportSource,
  objects: Record<string, string>[],
): ImportRow[] {
  return ADAPTERS[source](objects);
}
