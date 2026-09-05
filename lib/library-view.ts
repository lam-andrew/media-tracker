import type { Status } from "@/lib/constants";
import type { LibraryItem } from "@/lib/queries";

/**
 * Pure helpers for browsing a loaded library page: sort, text filter, and URL
 * building. Kept free of React/Next so they're trivially unit-tested and can
 * run on either side of the wire.
 */

export const LIBRARY_SORTS = ["added", "rating", "title", "year"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];
export const DEFAULT_SORT: LibrarySort = "added";

export const SORT_LABELS: Record<LibrarySort, string> = {
  added: "Recently added",
  rating: "Highest rated",
  title: "Title A–Z",
  year: "Newest release",
};

export function isLibrarySort(v: unknown): v is LibrarySort {
  return (
    typeof v === "string" && (LIBRARY_SORTS as readonly string[]).includes(v)
  );
}

/** Descending, with nulls (unrated / unknown year) sorted last. */
function descNullsLast(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

function byTitle(a: LibraryItem, b: LibraryItem): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

/**
 * Sort a library view. Input arrives newest-first from the query, and
 * Array.prototype.sort is stable, so ties keep "recently added" order.
 */
export function sortLibrary(
  items: LibraryItem[],
  sort: LibrarySort,
): LibraryItem[] {
  const out = [...items];
  switch (sort) {
    case "rating":
      return out.sort((a, b) => descNullsLast(a.rating, b.rating));
    case "title":
      return out.sort(byTitle);
    case "year":
      return out.sort(
        (a, b) => descNullsLast(a.releaseYear, b.releaseYear) || byTitle(a, b),
      );
    default:
      return out;
  }
}

/** Case-insensitive match on title or any creator; empty query = everything. */
export function filterLibrary(
  items: LibraryItem[],
  query: string,
): LibraryItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (i) =>
      i.title.toLowerCase().includes(q) ||
      i.creators.some((c) => c.toLowerCase().includes(q)),
  );
}

/** Build a library URL, omitting defaults so links stay clean and stable. */
export function libraryHref(
  basePath: string,
  params: { type?: string; status?: Status; sort?: LibrarySort },
): string {
  const sp = new URLSearchParams();
  if (params.type) sp.set("type", params.type);
  if (params.status) sp.set("status", params.status);
  if (params.sort && params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
