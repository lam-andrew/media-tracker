import type { MetadataProvider, NormalizedItem } from "./types";
import { googleBooksProvider } from "./google-books";
import { openLibraryProvider } from "./openlibrary";

/**
 * Book provider: Open Library first (reliable, no key), with Google Books as a
 * backup. Google Books is faster and slightly richer, but unauthenticated it
 * shares a tight per-IP quota and 429s under load (all Vercel requests egress
 * from shared IPs) — so without GOOGLE_BOOKS_API_KEY its fast path can't be
 * trusted as primary. If a key is ever set, flip these two calls to put Google
 * first and get ~10x faster book search; the backup keeps search resilient
 * either way.
 */
export const bookProvider: MetadataProvider = {
  type: "book",

  async search(query: string): Promise<NormalizedItem[]> {
    try {
      const items = await openLibraryProvider.search(query);
      if (items.length > 0) return items;
    } catch {
      // Open Library down/empty — fall through to Google Books.
    }
    return googleBooksProvider.search(query);
  },

  async getById(externalId: string): Promise<NormalizedItem | null> {
    // Legacy Open Library work keys resolve straight from Open Library (no quota).
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
