import type { Media } from "../../../packages/contracts/src/index.js";
export interface Provider {
  search(query: string): Promise<Media[]>;
  get(id: string): Promise<Media>;
}
interface Document {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
  first_publish_year?: number;
}
export function mapBook(doc: Document): Media {
  return {
    source: "openlibrary",
    externalId: doc.key,
    type: "book",
    title: doc.title,
    creators: doc.author_name ?? [],
    image: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    description: "",
    metadata: {
      pages: doc.number_of_pages_median ?? null,
      year: doc.first_publish_year ?? null,
    },
  };
}
const cache = new Map<string, { expires: number; value: Media[] }>();
const details = new Map<string, { expires: number; value: Media }>();
let lastRequest = 0;
let queue: Promise<unknown> = Promise.resolve();
async function request<T>(path: string) {
  const next = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastRequest = Date.now();
    const response = await fetch(`https://openlibrary.org${path}`, {
      headers: { "User-Agent": "Marqd/2 (personal media tracker)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw Object.assign(
        new Error("Book search is temporarily unavailable. Please try again."),
        { statusCode: 502 },
      );
    return response.json() as Promise<T>;
  });
  queue = next.catch(() => undefined);
  return next;
}
export const books: Provider = {
  async search(query) {
    const key = query.trim().toLowerCase();
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value;
    const data = await request<{ docs: Document[] }>(
      `/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year`,
    );
    const value = (data.docs as Document[])
      .filter((d) => /^\/works\/OL\d+W$/.test(d.key))
      .map(mapBook);
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, expires: Date.now() + 300000 });
    return value;
  },
  async get(id) {
    if (!/^\/works\/OL\d+W$/.test(id))
      throw Object.assign(new Error("Invalid book identifier"), {
        statusCode: 400,
      });
    const hit = details.get(id);
    if (hit && hit.expires > Date.now()) return hit.value;
    const data = await request<{
      title: string;
      covers?: number[];
      description?: string | { value: string };
      subjects?: string[];
    }>(`${id}.json`);
    let cached: Media | undefined;
    for (const hit of cache.values()) {
      cached = hit.value.find((m) => m.externalId === id);
      if (cached) break;
    }
    const value = {
      ...(cached ??
        mapBook({ key: id, title: data.title, cover_i: data.covers?.[0] })),
      metadata: {
        ...(cached?.metadata ?? {}),
        genres: (data.subjects ?? []).slice(0, 12),
      },
      description:
        typeof data.description === "string"
          ? data.description
          : (data.description?.value ?? ""),
    };
    if (details.size >= 200) details.delete(details.keys().next().value!);
    details.set(id, { value, expires: Date.now() + 300000 });
    return value;
  },
};
export const providers: Record<string, Provider> = { openlibrary: books };
