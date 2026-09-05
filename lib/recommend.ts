import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import type { NormalizedItem } from "@/lib/providers/types";
import { mapOpenLibraryDoc } from "@/lib/providers/openlibrary";
import { mapTmdbMovie, mapTmdbTv } from "@/lib/providers/tmdb";
import { mapRawgGame } from "@/lib/providers/rawg";

/**
 * Content-based, cross-media recommendations built from what the user has loved
 * (favorited, rated 4+, or completed). Each loved item is a *seed*: we ask its
 * source for "more like this" — TMDB recommendations, RAWG genre matches, and
 * for books both more-by-author and more-in-subject — then build two views:
 *
 * - `forYou`: one mixed feed scored by how often something is suggested,
 *   round-robined across media types so no single type floods it, each entry
 *   carrying the seed that explains it ("Because you loved …").
 * - `bySeed`: a row per seed with what's left after `forYou` took its picks,
 *   so the same title never shows twice on the page.
 *
 * Everything already in the library is excluded. `buildFeed` is pure and tested;
 * the fetchers around it are best-effort and never throw.
 */

export interface Seed {
  title: string;
  type: string;
  externalSource: string;
  externalId: string;
  creators: string[];
  genres: string[];
}

export interface Recommendation {
  item: NormalizedItem;
  because: string; // seed title
  score: number;
}

export interface RecommendationFeed {
  forYou: Recommendation[];
  bySeed: { seed: Seed; items: NormalizedItem[] }[];
}

export interface FeedOptions {
  limit: number; // forYou size
  rowSize: number; // max items per bySeed row
  minRow: number; // drop rows thinner than this
  maxRows: number;
}

const DEFAULT_FEED: FeedOptions = {
  limit: 12,
  rowSize: 8,
  minRow: 3,
  maxRows: 3,
};

const keyOf = (i: { externalSource: string; externalId: string }) =>
  `${i.externalSource}:${i.externalId}`;

/** Pure: turn per-seed suggestion batches into the two feed views. */
export function buildFeed(
  seeds: Seed[],
  batches: NormalizedItem[][],
  owned: Set<string>,
  opts: FeedOptions = DEFAULT_FEED,
): RecommendationFeed {
  const seedKeys = new Set(seeds.map(keyOf));
  const usable = (item: NormalizedItem) => {
    const k = keyOf(item);
    return Boolean(item.imageUrl) && !owned.has(k) && !seedKeys.has(k);
  };

  // Score by how many seeds suggested each title; remember the seeds (in order).
  const scored = new Map<
    string,
    { item: NormalizedItem; score: number; seeds: string[] }
  >();
  batches.forEach((batch, idx) => {
    const seedTitle = seeds[idx]?.title ?? "";
    for (const item of batch) {
      if (!usable(item)) continue;
      const k = keyOf(item);
      const entry = scored.get(k);
      if (entry) {
        entry.score += 1;
        if (!entry.seeds.includes(seedTitle)) entry.seeds.push(seedTitle);
      } else {
        scored.set(k, { item, score: 1, seeds: [seedTitle] });
      }
    }
  });

  // Group by media type and round-robin so the feed stays truly cross-media.
  const byType = new Map<
    string,
    (typeof scored extends Map<string, infer V> ? V : never)[]
  >();
  for (const entry of scored.values()) {
    const list = byType.get(entry.item.type) ?? [];
    list.push(entry);
    byType.set(entry.item.type, list);
  }
  for (const list of byType.values()) list.sort((a, b) => b.score - a.score);

  const typeLists = [...byType.values()];
  const forYou: Recommendation[] = [];
  let i = 0;
  while (forYou.length < opts.limit && typeLists.some((l) => l.length > 0)) {
    const next = typeLists[i % typeLists.length].shift();
    if (next) {
      forYou.push({
        item: next.item,
        because: next.seeds[0],
        score: next.score,
      });
    }
    i += 1;
  }

  // Per-seed rows from what's left; an item appears at most once on the page.
  const used = new Set(forYou.map((r) => keyOf(r.item)));
  const bySeed: RecommendationFeed["bySeed"] = [];
  for (let s = 0; s < seeds.length && bySeed.length < opts.maxRows; s += 1) {
    const items: NormalizedItem[] = [];
    for (const item of batches[s] ?? []) {
      const k = keyOf(item);
      if (!usable(item) || used.has(k)) continue;
      used.add(k);
      items.push(item);
      if (items.length >= opts.rowSize) break;
    }
    if (items.length >= opts.minRow) bySeed.push({ seed: seeds[s], items });
    else for (const item of items) used.delete(keyOf(item)); // give them back
  }

  return { forYou, bySeed };
}

// ---------------------------------------------------------------------------
// Fetchers (best-effort; each returns [] on any failure)
// ---------------------------------------------------------------------------

const UA = `${BRAND.name}/0.1 (media-tracker)`;
const OL_FIELDS =
  "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn";

async function tmdbSimilar(
  kind: "movie" | "tv",
  id: string,
): Promise<NormalizedItem[]> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${kind}/${id}/recommendations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown[] };
    const results = data.results ?? [];
    return kind === "movie"
      ? results.map((r) =>
          mapTmdbMovie(r as Parameters<typeof mapTmdbMovie>[0]),
        )
      : results.map((r) => mapTmdbTv(r as Parameters<typeof mapTmdbTv>[0]));
  } catch {
    return [];
  }
}

async function rawgSimilar(id: string): Promise<NormalizedItem[]> {
  const key = process.env.RAWG_API_KEY;
  if (!key) return [];
  try {
    // RAWG's /suggested endpoint needs a paid plan, so instead find top games
    // sharing this game's genres (the /games list is free).
    const detailRes = await fetch(
      `https://api.rawg.io/api/games/${id}?key=${key}`,
    );
    if (!detailRes.ok) return [];
    const detail = (await detailRes.json()) as { genres?: { id: number }[] };
    const genreIds = (detail.genres ?? []).map((g) => g.id).slice(0, 3);
    if (genreIds.length === 0) return [];
    const res = await fetch(
      `https://api.rawg.io/api/games?key=${key}&genres=${genreIds.join(",")}&ordering=-added&page_size=12`,
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Parameters<typeof mapRawgGame>[0][];
    };
    return (data.results ?? []).map(mapRawgGame);
  } catch {
    return [];
  }
}

async function olSearch(params: string): Promise<NormalizedItem[]> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?${params}&fields=${OL_FIELDS}&limit=8`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      docs?: Parameters<typeof mapOpenLibraryDoc>[0][];
    };
    return (data.docs ?? [])
      .filter((d) => d.key && d.title)
      .map(mapOpenLibraryDoc);
  } catch {
    return [];
  }
}

async function booksLike(seed: Seed): Promise<NormalizedItem[]> {
  const author = seed.creators[0];
  const subject = seed.genres[0];
  const [byAuthor, bySubject] = await Promise.all([
    author ? olSearch(`author=${encodeURIComponent(author)}`) : [],
    subject
      ? olSearch(`subject=${encodeURIComponent(subject)}&sort=rating`)
      : [],
  ]);
  return [...byAuthor, ...bySubject];
}

function similarFor(seed: Seed): Promise<NormalizedItem[]> {
  if (seed.type === "book") return booksLike(seed);
  if (seed.externalSource === "tmdb" && seed.type === "movie")
    return tmdbSimilar("movie", seed.externalId);
  if (seed.externalSource === "tmdb" && seed.type === "tv")
    return tmdbSimilar("tv", seed.externalId);
  if (seed.externalSource === "rawg") return rawgSimilar(seed.externalId);
  return Promise.resolve([]);
}

// ---------------------------------------------------------------------------

type LovedRow = {
  rating: number | null;
  favorite: boolean | null;
  updated_at: string | null;
  media_items: {
    title: string;
    type: string;
    external_source: string;
    external_id: string;
    creators: string[] | null;
    metadata: Record<string, unknown> | null;
  } | null;
};
type OwnedRow = {
  media_items: { external_source: string; external_id: string } | null;
};

const MAX_SEEDS = 8;

/** The signed-in user's recommendation feed (RLS scopes the reads). */
export async function getRecommendationFeed(): Promise<RecommendationFeed> {
  const supabase = await createClient();

  const { data: lovedData } = await supabase
    .from("user_items")
    .select(
      "rating, favorite, updated_at, media_items(title, type, external_source, external_id, creators, metadata)",
    )
    .or("favorite.eq.true,rating.gte.4,status.eq.completed")
    .limit(24);
  const lovedRows = ((lovedData as unknown as LovedRow[] | null) ?? []).filter(
    (
      r,
    ): r is LovedRow & { media_items: NonNullable<LovedRow["media_items"]> } =>
      Boolean(r.media_items),
  );
  if (lovedRows.length === 0) return { forYou: [], bySeed: [] };

  // Favorites first, then highest rated, then most recently touched.
  lovedRows.sort(
    (a, b) =>
      Number(b.favorite) - Number(a.favorite) ||
      (b.rating ?? 0) - (a.rating ?? 0) ||
      (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
  );
  const seeds: Seed[] = lovedRows.slice(0, MAX_SEEDS).map((r) => ({
    title: r.media_items.title,
    type: r.media_items.type,
    externalSource: r.media_items.external_source,
    externalId: r.media_items.external_id,
    creators: r.media_items.creators ?? [],
    genres: Array.isArray(r.media_items.metadata?.genres)
      ? (r.media_items.metadata!.genres as unknown[]).filter(
          (g): g is string => typeof g === "string",
        )
      : [],
  }));

  const { data: ownedData } = await supabase
    .from("user_items")
    .select("media_items(external_source, external_id)");
  const owned = new Set(
    ((ownedData as unknown as OwnedRow[] | null) ?? [])
      .map((r) => r.media_items)
      .filter((m): m is NonNullable<OwnedRow["media_items"]> => Boolean(m))
      .map((m) => `${m.external_source}:${m.external_id}`),
  );

  const batches = await Promise.all(seeds.map(similarFor));
  return buildFeed(seeds, batches, owned);
}
