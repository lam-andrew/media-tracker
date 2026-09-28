import type { Media } from "../../../packages/contracts/src/index.js";
interface Volume {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string };
  };
}
const map = (v: Volume): Media => ({
  source: "googlebooks",
  externalId: v.id,
  type: "book",
  title: v.volumeInfo?.title ?? "Untitled",
  creators: v.volumeInfo?.authors ?? [],
  image:
    v.volumeInfo?.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null,
  description: v.volumeInfo?.description ?? "",
  metadata: {
    pages: v.volumeInfo?.pageCount ?? null,
    year: Number(v.volumeInfo?.publishedDate?.slice(0, 4)) || null,
    genres: v.volumeInfo?.categories ?? [],
  },
});
async function request(path: string) {
  const url = new URL("https://www.googleapis.com/books/v1/volumes" + path);
  if (process.env.GOOGLE_BOOKS_API_KEY)
    url.searchParams.set("key", process.env.GOOGLE_BOOKS_API_KEY);
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok)
    throw Object.assign(
      new Error(
        "Book catalogs are temporarily unavailable. Please try again later.",
      ),
      { statusCode: 503 },
    );
  return r.json();
}
export const googleBooks = {
  search: async (q: string) => {
    const data = (await request(
      "?maxResults=20&q=" + encodeURIComponent(q),
    )) as { items?: Volume[] };
    return (data.items ?? []).map(map);
  },
  get: async (id: string) => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id))
      throw Object.assign(new Error("Invalid book id"), { statusCode: 400 });
    return map((await request("/" + id)) as Volume);
  },
};
