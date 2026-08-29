/**
 * Provider abstraction for the generic media engine.
 *
 * Every media type (book, movie, tv, game, and anything added later) flows through
 * the same `MetadataProvider` interface, returning `NormalizedItem`s. Adding a new
 * type = write one provider + register it — no schema or core changes. See
 * docs/BUILD.md §8.
 */

/** Open by design; MVP uses "book" | "movie" | "tv" | "game". */
export type MediaType = string;

export interface NormalizedItem {
  externalSource: string; // "openlibrary" | "tmdb" | "rawg"
  externalId: string;
  type: MediaType;
  title: string;
  creators: string[];
  imageUrl: string | null;
  releaseYear: number | null;
  metadata: Record<string, unknown>;
}

export interface MetadataProvider {
  type: MediaType;
  search(query: string): Promise<NormalizedItem[]>;
  getById(externalId: string): Promise<NormalizedItem | null>;
}
