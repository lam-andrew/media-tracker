import type { MetadataProvider, NormalizedItem } from "./types";
import { normalizeTitle, yearFrom } from "./normalize";

/**
 * RAWG provider (games). Requires an API key in RAWG_API_KEY.
 * https://rawg.io/apidocs
 *
 * RAWG has no box art — `background_image` is a screenshot, which is why even
 * blockbusters look rough. Steam's CDN serves a proper portrait cover per app
 * id, so for games sold on Steam we swap that in (keyless, best-effort).
 */

const BASE = "https://api.rawg.io/api";
const STEAM_SEARCH = "https://store.steampowered.com/api/storesearch/";
const STEAM_TIMEOUT_MS = 2500;

export interface RawgGame {
  id: number;
  name?: string;
  released?: string | null;
  background_image?: string | null;
  platforms?: { platform: { name: string } }[] | null;
  playtime?: number;
  added?: number;
  stores?: { store: { slug: string } }[] | null;
}

interface RawgGameDetail extends RawgGame {
  description_raw?: string;
  genres?: { name: string }[];
  metacritic?: number | null;
  developers?: { name: string }[];
  publishers?: { name: string }[];
}

interface RawgNamed {
  slug: string;
  name: string;
  games_count?: number;
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
      popularity: g.added ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Steam cover art
// ---------------------------------------------------------------------------

export function steamCoverUrl(appId: string | number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`;
}

const onSteam = (g: RawgGame) =>
  (g.stores ?? []).some((s) => s.store?.slug === "steam");

async function coverExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(STEAM_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Steam listings for a query, keyed by normalized title (keyless store search). */
async function steamListings(query: string): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const res = await fetch(
      `${STEAM_SEARCH}?term=${encodeURIComponent(query)}&cc=US&l=en`,
      { signal: AbortSignal.timeout(STEAM_TIMEOUT_MS) },
    );
    if (!res.ok) return map;
    const data = (await res.json()) as {
      items?: { id: number; name: string }[];
    };
    for (const it of data.items ?? []) {
      const key = normalizeTitle(it.name);
      if (!map.has(key)) map.set(key, it.id);
    }
  } catch {
    // keep RAWG art
  }
  return map;
}

/** Store re-releases carry suffixes ("… Enhanced", "… Definitive Edition"). */
const EDITION_WORDS = new Set([
  "enhanced",
  "definitive",
  "edition",
  "remastered",
  "complete",
  "goty",
  "game",
  "of",
  "the",
  "year",
  "legendary",
  "ultimate",
  "deluxe",
  "hd",
  "directors",
  "cut",
  "anniversary",
  "remake",
  "collection",
  "special",
]);

/** Find the Steam app id for a title: exact match, else title + edition suffix. */
export function matchSteamApp(
  title: string,
  listings: Map<string, number>,
): number | undefined {
  const want = normalizeTitle(title);
  if (!want) return undefined;
  const exact = listings.get(want);
  if (exact) return exact;
  for (const [name, id] of listings) {
    if (!name.startsWith(want + " ")) continue;
    const rest = name.slice(want.length).trim().split(" ");
    if (rest.every((w) => EDITION_WORDS.has(w))) return id;
  }
  return undefined;
}

/** Swap in Steam portrait covers for results that match a Steam listing. */
async function withSteamArt(
  games: RawgGame[],
  listings: Map<string, number>,
): Promise<NormalizedItem[]> {
  const items = games.map(mapRawgGame);
  await Promise.all(
    items.map(async (item, i) => {
      if (!onSteam(games[i])) return;
      const appId = matchSteamApp(item.title, listings);
      if (!appId) return;
      const url = steamCoverUrl(appId);
      if (await coverExists(url)) item.imageUrl = url;
    }),
  );
  return items;
}

/** The Steam app id from RAWG's store links for one game, if sold there. */
async function steamAppIdFor(externalId: string): Promise<string | undefined> {
  const data = (await rawgFetch(`/games/${externalId}/stores`)) as {
    results?: { url?: string }[];
  };
  for (const s of data.results ?? []) {
    const m = /store\.steampowered\.com\/app\/(\d+)/.exec(s.url ?? "");
    if (m) return m[1];
  }
  return undefined;
}

// ---------------------------------------------------------------------------

/** Best RAWG developer/publisher slug for a name: exact match, else most games. */
async function findSlug(
  kind: "developers" | "publishers",
  name: string,
): Promise<string | null> {
  const data = (await rawgFetch(
    `/${kind}?search=${encodeURIComponent(name)}&page_size=10`,
  )) as { results?: RawgNamed[] };
  const list = data.results ?? [];
  const want = normalizeTitle(name);
  const exact = list.find((r) => normalizeTitle(r.name) === want);
  const pick =
    exact ??
    [...list].sort((a, b) => (b.games_count ?? 0) - (a.games_count ?? 0))[0];
  return pick?.slug ?? null;
}

export const rawgProvider: MetadataProvider = {
  type: "game",

  async search(query: string): Promise<NormalizedItem[]> {
    // Steam lookup runs alongside RAWG's (slow) search, so it adds no latency.
    const [data, listings] = await Promise.all([
      rawgFetch(
        `/games?page_size=20&search=${encodeURIComponent(query)}`,
      ) as Promise<{
        results?: RawgGame[];
      }>,
      steamListings(query),
    ]);
    return withSteamArt(data.results ?? [], listings);
  },

  async getById(externalId: string): Promise<NormalizedItem | null> {
    const g = (await rawgFetch(`/games/${externalId}`)) as RawgGameDetail;
    if (!g?.id) return null;
    const base = mapRawgGame(g);
    const developers = (g.developers ?? []).map((d) => d.name);
    const publishers = (g.publishers ?? []).map((p) => p.name);

    let imageUrl = base.imageUrl;
    if (onSteam(g)) {
      try {
        const appId = await steamAppIdFor(externalId);
        if (appId && (await coverExists(steamCoverUrl(appId)))) {
          imageUrl = steamCoverUrl(appId);
        }
      } catch {
        // keep RAWG art
      }
    }

    return {
      ...base,
      imageUrl,
      creators: developers.length ? developers : publishers,
      metadata: {
        description: g.description_raw ?? null,
        genres: (g.genres ?? []).map((x) => x.name),
        platforms: (g.platforms ?? []).map((p) => p.platform.name),
        playtime: g.playtime ?? null,
        metacritic: g.metacritic ?? null,
        popularity: g.added ?? null,
        developers,
        publishers,
      },
    };
  },

  async byCreator(name: string): Promise<NormalizedItem[]> {
    for (const kind of ["developers", "publishers"] as const) {
      const slug = await findSlug(kind, name);
      if (!slug) continue;
      const data = (await rawgFetch(
        `/games?${kind}=${slug}&page_size=20&ordering=-added`,
      )) as { results?: RawgGame[] };
      const games = data.results ?? [];
      if (games.length) return games.map(mapRawgGame);
    }
    return [];
  },
};
