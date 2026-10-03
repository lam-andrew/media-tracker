import { boardGames } from "./boardgames.js";
import { googleBooks } from "./google-books.js";
import {
  movieProvider,
  tvProvider,
  tmdbFetch,
  mapTmdbMovie,
  mapTmdbTv,
} from "./legacy-providers/tmdb.js";
import {
  rawgProvider,
  rawgFetch,
  mapRawgGame,
} from "./legacy-providers/rawg.js";
import { books, type Provider } from "./providers.js";
import type {
  NormalizedItem,
  MetadataProvider,
} from "./legacy-providers/types.js";
import { mediaKey, type Media } from "../../../packages/contracts/src/index.js";
export interface CatalogProvider extends Provider {
  byCreator?: (name: string) => Promise<Media[]>;
}
const mapped = (m: NormalizedItem): Media => ({
  source: m.externalSource,
  externalId: m.externalId,
  type: m.type,
  title: m.title,
  creators: m.creators,
  image: m.imageUrl,
  description: String(m.metadata.description ?? m.metadata.overview ?? ""),
  metadata: {
    ...m.metadata,
    year: m.releaseYear,
    completion: m.type === "game" ? 100 : null,
  },
});
const cache = new Map<string, { until: number; value: Media[] }>();
async function cached(key: string, load: () => Promise<Media[]>) {
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value;
  try {
    const value = await load();
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { value, until: Date.now() + 300000 });
    return value;
  } catch {
    throw Object.assign(
      new Error(
        "This catalog is unavailable. Check its API configuration or try again shortly.",
      ),
      { statusCode: 503 },
    );
  }
}
const wrap = (p: MetadataProvider): CatalogProvider => ({
  search: (q) =>
    cached(p.type + ":search:" + q, async () =>
      rank((await p.search(q)).map(mapped), q),
    ),
  get: async (id) => {
    if (!/^\d+$/.test(id))
      throw Object.assign(new Error("Invalid media identifier"), {
        statusCode: 400,
      });
    const result = await cached(p.type + ":id:" + id, async () => {
      const m = await p.getById(id);
      return m ? [mapped(m)] : [];
    });
    if (!result[0])
      throw Object.assign(new Error("Media not found"), { statusCode: 404 });
    return result[0];
  },
  byCreator: (name) =>
    cached(p.type + ":creator:" + name, async () =>
      p.byCreator ? (await p.byCreator(name)).map(mapped) : [],
    ),
});
export const catalog: Record<string, CatalogProvider> = {
  book: {
    ...books,
    search: async (query) => {
      try {
        return await books.search(query);
      } catch {
        return googleBooks.search(query);
      }
    },
    byCreator: async (name) => {
      try {
        return await books.search("author:" + name);
      } catch {
        return googleBooks.search("inauthor:" + name);
      }
    },
  },
  movie: wrap(movieProvider),
  tv: wrap(tvProvider),
  game: wrap(rawgProvider),
  boardgame: boardGames,
};
export function rank(items: Media[], query: string) {
  const seen = new Set<string>();
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  return [...items]
    .sort(
      (a, b) =>
        Number(norm(b.title) === norm(query)) -
          Number(norm(a.title) === norm(query)) ||
        Number(!!b.image) - Number(!!a.image) ||
        Number(b.metadata.popularity ?? 0) - Number(a.metadata.popularity ?? 0),
    )
    .filter((m) => {
      const key = `${m.type}|${norm(m.title)}|${m.metadata.year ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export const providerAvailability = () => ({
  book: true,
  movie: !!process.env.TMDB_ACCESS_TOKEN,
  tv: !!process.env.TMDB_ACCESS_TOKEN,
  game: !!process.env.RAWG_API_KEY,
  boardgame: !!process.env.BGG_API_TOKEN,
});

export const getMedia = async (type: string, id: string, source?: string) =>
  type === "book" && source === "googlebooks"
    ? googleBooks.get(id)
    : catalog[type].get(id);
export async function similar(seed: Media): Promise<Media[]> {
  if (seed.source === "tmdb" && (seed.type === "movie" || seed.type === "tv"))
    return cached("similar:" + mediaKey(seed), async () => {
      const d = (await tmdbFetch(
        `/${seed.type}/${encodeURIComponent(seed.externalId)}/recommendations`,
      )) as { results?: Parameters<typeof mapTmdbMovie>[0][] };
      return (d.results ?? []).map((m) =>
        mapped(seed.type === "movie" ? mapTmdbMovie(m) : mapTmdbTv(m)),
      );
    });
  if (seed.type === "game") {
    const g = (seed.metadata.genres as string[] | undefined)?.[0];
    if (g)
      return cached("gamegenre:" + g, async () => {
        const d = (await rawgFetch(
          "/games?page_size=20&ordering=-rating&genres=" +
            encodeURIComponent(g.toLowerCase().replaceAll(" ", "-")),
        )) as { results?: Parameters<typeof mapRawgGame>[0][] };
        return (d.results ?? []).map((m) => mapped(mapRawgGame(m)));
      });
  }
  const p = catalog[seed.type];
  return seed.creators[0] && p.byCreator
    ? p.byCreator(seed.creators[0])
    : p.search(seed.title);
}
