import { getProvider } from "@/lib/providers/registry";
import type { NormalizedItem } from "@/lib/providers/types";
import { cleanTitle } from "./goodreads";
import { titleSimilarity } from "./similarity";
import type { ImportRow } from "./types";

/**
 * Match imported rows to provider items. Server-only (does network I/O), but
 * kept out of the "use server" module so it can be unit-tested with a mocked
 * fetch and provider registry.
 */

export type Confidence = "exact" | "likely" | "none";

export interface MatchResult {
  row: ImportRow;
  item: NormalizedItem | null;
  confidence: Confidence;
}

/** Below this title similarity a search hit is only a suggestion, not a match. */
export const LIKELY_THRESHOLD = 0.6;
const OL_UA = "media-tracker import (+https://openlibrary.org)";

interface OpenLibraryEdition {
  works?: { key: string }[];
  title?: string;
  covers?: number[];
  publish_date?: string;
  number_of_pages?: number;
}

/** Open Library ISBN lookup → a NormalizedItem keyed by the work, or null. */
export async function lookupIsbn(
  row: ImportRow,
  fetchImpl: typeof fetch = fetch,
): Promise<NormalizedItem | null> {
  if (!row.isbn) return null;
  const res = await fetchImpl(`https://openlibrary.org/isbn/${row.isbn}.json`, {
    headers: { "User-Agent": OL_UA, accept: "application/json" },
  });
  if (!res.ok) return null;
  const edition = (await res.json()) as OpenLibraryEdition;
  const workKey = edition.works?.[0]?.key;
  if (!workKey) return null;
  const coverId = edition.covers?.find((c) => typeof c === "number" && c > 0);
  return {
    externalSource: "openlibrary",
    externalId: workKey,
    type: row.type,
    title: edition.title?.trim() || row.title,
    creators: row.creators,
    imageUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null,
    releaseYear: row.year,
    metadata: {
      isbn: row.isbn,
      pageCount: edition.number_of_pages ?? null,
    },
  };
}

/** Score search candidates against the row: year-agreeing hits win ties. */
export function pickBest(
  row: ImportRow,
  candidates: NormalizedItem[],
): { item: NormalizedItem | null; confidence: Confidence } {
  const target = cleanTitle(row.title);
  let best: { item: NormalizedItem; score: number; yearMatch: boolean } | null =
    null;
  for (const item of candidates) {
    const score = Math.max(
      titleSimilarity(target, item.title),
      titleSimilarity(row.title, item.title),
    );
    const yearMatch = row.year !== null && item.releaseYear === row.year;
    if (
      !best ||
      score > best.score + 1e-9 ||
      (Math.abs(score - best.score) < 1e-9 && yearMatch && !best.yearMatch)
    ) {
      best = { item, score, yearMatch };
    }
  }
  if (!best) return { item: null, confidence: "none" };
  if (best.score < LIKELY_THRESHOLD)
    return { item: best.item, confidence: "none" };
  return {
    item: best.item,
    confidence: best.yearMatch ? "exact" : "likely",
  };
}

function searchQuery(row: ImportRow): string {
  const title = cleanTitle(row.title);
  const author = row.creators[0];
  return author ? `${title} ${author}` : title;
}

/** Match one row: ISBN lookup when available, else provider search + similarity. */
export async function matchRow(
  row: ImportRow,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchResult> {
  if (row.isbn) {
    try {
      const item = await lookupIsbn(row, fetchImpl);
      if (item) return { row, item, confidence: "exact" };
    } catch {
      // Fall through to a title search.
    }
  }
  const provider = getProvider(row.type);
  if (!provider) return { row, item: null, confidence: "none" };
  try {
    const candidates = await provider.search(searchQuery(row));
    return { row, ...pickBest(row, candidates) };
  } catch {
    return { row, item: null, confidence: "none" };
  }
}

/** Run `fn` over `items` with at most `limit` in flight; preserves order. */
export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

export function matchRows(
  rows: ImportRow[],
  concurrency = 4,
  fetchImpl: typeof fetch = fetch,
): Promise<MatchResult[]> {
  return mapPool(rows, concurrency, (row) => matchRow(row, fetchImpl));
}
