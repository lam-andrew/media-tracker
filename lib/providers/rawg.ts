import type { MetadataProvider, NormalizedItem } from "./types";
import { yearFrom } from "./normalize";

/**
 * RAWG provider (games). Requires an API key in RAWG_API_KEY.
 * https://rawg.io/apidocs
 */

const BASE = "https://api.rawg.io/api";

export interface RawgGame {
  id: number;
  name?: string;
  released?: string | null;
  background_image?: string | null;
  platforms?: { platform: { name: string } }[] | null;
  playtime?: number;
}

interface RawgGameDetail extends RawgGame {
  description_raw?: string;
  genres?: { name: string }[];
  metacritic?: number | null;
}

async function rawgFetch(path: string): Promise<unknown> {
  const key = process.env.RAWG_API_KEY;
  if (!key) throw new Error("RAWG_API_KEY is not set");
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}key=${key}`);
  if (!res.ok) throw new Error(`RAWG request failed: ${res.status}`);
  return res.json();
}

/** Pure mapper: a RAWG game result → NormalizedItem. */
export function mapRawgGame(g: RawgGame): NormalizedItem {
  return {
    externalSource: "rawg",
    externalId: String(g.id),
    type: "game",
    title: g.name ?? "Untitled",
    creators: [],
    imageUrl: g.background_image ?? null,
    releaseYear: yearFrom(g.released),
    metadata: {
      platforms: (g.platforms ?? []).map((p) => p.platform.name),
      playtime: g.playtime ?? null,
    },
  };
}

export const rawgProvider: MetadataProvider = {
  type: "game",
  async search(query: string): Promise<NormalizedItem[]> {
    const data = (await rawgFetch(
      `/games?page_size=20&search=${encodeURIComponent(query)}`,
    )) as { results?: RawgGame[] };
    return (data.results ?? []).map(mapRawgGame);
  },
  async getById(externalId: string): Promise<NormalizedItem | null> {
    const g = (await rawgFetch(`/games/${externalId}`)) as RawgGameDetail;
    if (!g?.id) return null;
    return {
      ...mapRawgGame(g),
      metadata: {
        description: g.description_raw ?? null,
        genres: (g.genres ?? []).map((x) => x.name),
        platforms: (g.platforms ?? []).map((p) => p.platform.name),
        playtime: g.playtime ?? null,
        metacritic: g.metacritic ?? null,
      },
    };
  },
};
