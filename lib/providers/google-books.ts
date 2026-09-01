import type { MetadataProvider, NormalizedItem } from "./types";
import { yearFrom } from "./normalize";
import { openLibraryProvider } from "./openlibrary";

/**
 * Google Books provider (books). ~10x faster than Open Library search and returns
 * descriptions + categories inline. No API key required for basic search.
 * getById also handles legacy Open Library work keys so books saved before this
 * switch still enrich on their detail page.
 */
const BASE = "https://www.googleapis.com/books/v1/volumes";

interface GVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

function cover(info: GVolume["volumeInfo"]): string | null {
  const raw = info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail;
  return raw ? raw.replace(/^http:/, "https:") : null;
}

function mapVolume(v: GVolume): NormalizedItem {
  const info = v.volumeInfo ?? {};
  const isbn =
    info.industryIdentifiers?.find(
      (i) => i.type === "ISBN_13" || i.type === "ISBN_10",
    )?.identifier ?? null;
  return {
    externalSource: "googlebooks",
    externalId: v.id,
    type: "book",
    title: info.title ?? "Untitled",
    creators: info.authors ?? [],
    imageUrl: cover(info),
    releaseYear: yearFrom(info.publishedDate),
    metadata: {
      description: info.description ?? null,
      genres: info.categories ?? [],
      pageCount: info.pageCount ?? null,
      isbn,
    },
  };
}

export const googleBooksProvider: MetadataProvider = {
  type: "book",

  async search(query: string): Promise<NormalizedItem[]> {
    const res = await fetch(
      `${BASE}?q=${encodeURIComponent(query)}&maxResults=20&printType=books`,
    );
    if (!res.ok) throw new Error(`Google Books search failed: ${res.status}`);
    const data = (await res.json()) as { items?: GVolume[] };
    return (data.items ?? []).filter((v) => v.volumeInfo?.title).map(mapVolume);
  },

  async getById(externalId: string): Promise<NormalizedItem | null> {
    // Books saved before the switch have Open Library work keys (/works/OL…W).
    if (externalId.startsWith("/works/")) {
      return openLibraryProvider.getById(externalId);
    }
    const res = await fetch(`${BASE}/${externalId}`);
    if (!res.ok) return null;
    const v = (await res.json()) as GVolume;
    return v?.id ? mapVolume(v) : null;
  },
};
