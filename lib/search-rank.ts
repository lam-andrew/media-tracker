import type { NormalizedItem } from "@/lib/providers/types";
import { normalizeTitle } from "@/lib/providers/normalize";

/**
 * Order search results for humans and collapse near-duplicates.
 *
 * Sources return relevance order but also junk: entries with no artwork, no
 * year, or several near-identical rows for one title. We keep each source's
 * order as the tiebreak (sort is stable) and bucket by: exact title match,
 * has artwork, then the source's own popularity signal (`metadata.popularity`:
 * TMDB popularity, RAWG "added", Open Library edition_count, Google ratingsCount).
 * Rows with the same type + title + year collapse to the best one.
 */
export function rankResults(
  items: NormalizedItem[],
  query?: string,
): NormalizedItem[] {
  const q = query ? normalizeTitle(query) : "";
  const best = new Map<string, NormalizedItem>();
  const order: string[] = [];
  for (const item of items) {
    const key = `${item.type}|${normalizeTitle(item.title)}|${item.releaseYear ?? ""}`;
    const cur = best.get(key);
    if (!cur) {
      best.set(key, item);
      order.push(key);
    } else if (compare(item, cur, q) < 0) {
      best.set(key, item);
    }
  }
  return order.map((k) => best.get(k)!).sort((a, b) => compare(a, b, q));
}

function popularity(i: NormalizedItem): number {
  const p = i.metadata.popularity;
  return typeof p === "number" && Number.isFinite(p) ? p : 0;
}

/** Negative when `a` should come before `b`. */
function compare(a: NormalizedItem, b: NormalizedItem, q: string): number {
  const exact = (i: NormalizedItem) =>
    q && normalizeTitle(i.title) === q ? 1 : 0;
  const art = (i: NormalizedItem) => (i.imageUrl ? 1 : 0);
  return (
    exact(b) - exact(a) || art(b) - art(a) || popularity(b) - popularity(a)
  );
}
