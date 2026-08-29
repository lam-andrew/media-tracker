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
