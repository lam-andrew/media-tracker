import type { MetadataProvider, NormalizedItem } from "./types";

/**
 * Open Library provider (books). No API key required.
 * https://openlibrary.org/dev/docs/api/search
 */

const SEARCH_URL = "https://openlibrary.org/search.json";
const FIELDS =
  "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn";
const UA = "Marqd/0.1 (media-tracker)";

export interface OpenLibraryDoc {
  key: string; // e.g. "/works/OL45804W"
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  isbn?: string[];
}

function coverUrl(coverId: number | undefined): string | null {
  return coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : null;
}

/** Pure mapper: an Open Library search doc → NormalizedItem. */
export function mapOpenLibraryDoc(doc: OpenLibraryDoc): NormalizedItem {
  return {
    externalSource: "openlibrary",
    externalId: doc.key,
    type: "book",
    title: doc.title ?? "Untitled",
    creators: doc.author_name ?? [],
    imageUrl: coverUrl(doc.cover_i),
    releaseYear: doc.first_publish_year ?? null,
    metadata: {
      pageCount: doc.number_of_pages_median ?? null,
      isbn: doc.isbn?.[0] ?? null,
    },
  };
}

export const openLibraryProvider: MetadataProvider = {
  type: "book",

  async search(query: string): Promise<NormalizedItem[]> {
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&fields=${FIELDS}&limit=20`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      throw new Error(`Open Library search failed: ${res.status}`);
    }
    const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? [])
      .filter((d) => d.key && d.title)
      .map(mapOpenLibraryDoc);
  },

  async getById(externalId: string): Promise<NormalizedItem | null> {
    const res = await fetch(`https://openlibrary.org${externalId}.json`, {
      headers: { "User-Agent": UA },
    });
    if (!res.ok) return null;
    const work = (await res.json()) as {
      title?: string;
      covers?: number[];
      description?: string | { value?: string };
      subjects?: string[];
    };
    const description =
      typeof work.description === "string"
        ? work.description
        : (work.description?.value ?? null);
    return {
      externalSource: "openlibrary",
      externalId,
      type: "book",
      title: work.title ?? "Untitled",
      creators: [],
      imageUrl: coverUrl(work.covers?.[0]),
      releaseYear: null,
      metadata: {
        description,
        genres: (work.subjects ?? []).slice(0, 6),
      },
    };
  },
};
