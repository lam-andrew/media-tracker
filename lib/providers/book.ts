import type { MetadataProvider, NormalizedItem } from "./types";
import { googleBooksProvider } from "./google-books";
import { openLibraryProvider } from "./openlibrary";

/**
 * Book provider: two sources behind one interface, ordered by trust.
 *
 * - With GOOGLE_BOOKS_API_KEY set, Google Books is primary (~0.15 s, richer
 *   inline data) and Open Library is the backup.
 * - Without a key, unauthenticated Google Books 429s on shared IPs (Vercel), so
 *   Open Library (reliable, ~1.5 s) is primary and Google Books is the backup.
 *
 * Either way a failed or empty primary falls through to the backup, so book
 * search never hard-fails on one upstream. See ADR 0012.
 */
const googleFirst = Boolean(process.env.GOOGLE_BOOKS_API_KEY);
const [primary, backup] = googleFirst
  ? [googleBooksProvider, openLibraryProvider]
  : [openLibraryProvider, googleBooksProvider];

export const bookProvider: MetadataProvider = {
  type: "book",

  async search(query: string): Promise<NormalizedItem[]> {
    try {
      const items = await primary.search(query);
      if (items.length > 0) return items;
    } catch {
      // Primary down or empty — fall through to the backup.
    }
    return backup.search(query);
  },

  async getById(externalId: string): Promise<NormalizedItem | null> {
    // Route by id shape, independent of which source is primary.
    if (externalId.startsWith("/works/")) {
      return openLibraryProvider.getById(externalId);
    }
    try {
      return await googleBooksProvider.getById(externalId);
    } catch {
      return null;
    }
  },
};
