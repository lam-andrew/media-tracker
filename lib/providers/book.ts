import type { MetadataProvider, NormalizedItem } from "./types";
import { googleBooksProvider } from "./google-books";
import { openLibraryProvider } from "./openlibrary";

/**
 * Book provider: Google Books first (fast, rich descriptions), with Open Library
 * as a resilient fallback. Unauthenticated Google Books shares a tight per-IP
 * quota and returns 429s under load (all Vercel requests egress from shared IPs),
 * so a Google Books failure must never fail the search — we fall back to the
 * slower-but-reliable Open Library instead. Set GOOGLE_BOOKS_API_KEY to raise
 * the quota and stay on the fast path.
 */
export const bookProvider: MetadataProvider = {
  type: "book",

  async search(query: string): Promise<NormalizedItem[]> {
    try {
      const items = await googleBooksProvider.search(query);
      if (items.length > 0) return items;
    } catch {
      // 429 or network error — fall through to Open Library.
    }
    return openLibraryProvider.search(query);
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
