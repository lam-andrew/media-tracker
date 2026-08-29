import type { MetadataProvider } from "./types";
import { openLibraryProvider } from "./openlibrary";
import { movieProvider, tvProvider } from "./tmdb";
import { rawgProvider } from "./rawg";

/**
 * Maps a media type to its metadata provider. Adding a new media type means
 * adding one entry here plus a MEDIA_TYPES config entry — nothing else. See ADR 0002.
 */
export const PROVIDERS: Record<string, MetadataProvider> = {
  book: openLibraryProvider,
  movie: movieProvider,
  tv: tvProvider,
  game: rawgProvider,
};

export function getProvider(type: string): MetadataProvider | undefined {
  return PROVIDERS[type];
}
