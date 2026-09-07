import type { NormalizedItem } from "./types";

/**
 * Shared helpers for mapping external provider responses into `NormalizedItem`.
 */

/** Extract a 4-digit year from an ISO-ish date string (e.g. "2021-10-01"), or null. */
export function yearFrom(date: string | null | undefined): number | null {
  if (!date) return null;
  const match = /^(\d{4})/.exec(date.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

/**
 * Lowercase, accent-strip, drop punctuation and leading articles, collapse
 * whitespace — for matching the same title across sources ("The Witcher 3:
 * Wild Hunt" ≈ "witcher 3 wild hunt").
 */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fold a detail lookup into a search-result stub: fuller creators, better art,
 * richer metadata. Leaves the stub untouched when the lookup failed.
 */
export function mergeEnrichment(
  base: NormalizedItem,
  enriched: NormalizedItem | null | undefined,
): NormalizedItem {
  if (!enriched) return base;
  return {
    ...base,
    creators: enriched.creators.length ? enriched.creators : base.creators,
    imageUrl: enriched.imageUrl ?? base.imageUrl,
    metadata: { ...base.metadata, ...enriched.metadata },
  };
}
