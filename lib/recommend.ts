import { createClient } from "@/lib/supabase/server";
import type { NormalizedItem } from "@/lib/providers/types";
import { mapOpenLibraryDoc } from "@/lib/providers/openlibrary";
import { mapTmdbMovie, mapTmdbTv } from "@/lib/providers/tmdb";
import { mapRawgGame } from "@/lib/providers/rawg";

/**
 * Content-based, cross-media recommendations built from what the user has loved
 * (favorited, rated 4+, or completed). For each loved item we ask its own source
 * for "more like this" — TMDB recommendations, RAWG suggested, and more-by-author
 * for books — then merge into one mixed feed, scoring by how often something is
 * suggested and dropping anything already in the library.
 */

type LovedRow = {
  media_items: {
    type: string;
    external_source: string;
    external_id: string;
    creators: string[] | null;
  } | null;
};
type OwnedRow = {
  media_items: { external_source: string; external_id: string } | null;
};

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
    if (kind === "movie") {
      return results.map((r) =>
        mapTmdbMovie(r as Parameters<typeof mapTmdbMovie>[0]),
      );
    }
    return results.map((r) => mapTmdbTv(r as Parameters<typeof mapTmdbTv>[0]));
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

async function olByAuthor(
  author: string | undefined,
): Promise<NormalizedItem[]> {
  if (!author) return [];
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median,isbn&limit=8`,
      { headers: { "User-Agent": "Marqd/0.1 (media-tracker)" } },
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

export async function getRecommendations(
  limit = 12,
): Promise<NormalizedItem[]> {
  const supabase = await createClient();

  const { data: lovedData } = await supabase
    .from("user_items")
    .select("media_items(type, external_source, external_id, creators)")
    .or("favorite.eq.true,rating.gte.4,status.eq.completed")
    .limit(12);
  const loved = ((lovedData as unknown as LovedRow[] | null) ?? [])
    .map((r) => r.media_items)
    .filter((m): m is NonNullable<LovedRow["media_items"]> => Boolean(m));
  if (loved.length === 0) return [];

  const { data: ownedData } = await supabase
    .from("user_items")
    .select("media_items(external_source, external_id)");
  const owned = new Set(
    ((ownedData as unknown as OwnedRow[] | null) ?? [])
      .map((r) => r.media_items)
      .filter(Boolean)
      .map((m) => `${m!.external_source}:${m!.external_id}`),
  );

  const sample = loved.slice(0, 6);
  const batches = await Promise.all(
    sample.map((m) => {
      if (m.external_source === "tmdb" && m.type === "movie")
        return tmdbSimilar("movie", m.external_id);
      if (m.external_source === "tmdb" && m.type === "tv")
        return tmdbSimilar("tv", m.external_id);
      if (m.external_source === "rawg") return rawgSimilar(m.external_id);
      if (m.external_source === "openlibrary")
        return olByAuthor(m.creators?.[0]);
      return Promise.resolve([]);
    }),
  );

  const scored = new Map<string, { item: NormalizedItem; score: number }>();
  for (const batch of batches) {
    for (const item of batch) {
      const key = `${item.externalSource}:${item.externalId}`;
      if (owned.has(key) || !item.imageUrl) continue;
      const existing = scored.get(key);
      if (existing) existing.score += 1;
      else scored.set(key, { item, score: 1 });
    }
  }

  // Group by media type and round-robin across types so the feed stays truly
  // cross-media (otherwise one prolific type — e.g. games — fills every slot).
  const byType = new Map<string, { item: NormalizedItem; score: number }[]>();
  for (const entry of scored.values()) {
    const list = byType.get(entry.item.type) ?? [];
    list.push(entry);
    byType.set(entry.item.type, list);
  }
  for (const list of byType.values()) list.sort((a, b) => b.score - a.score);

  const typeLists = [...byType.values()];
  const result: NormalizedItem[] = [];
  let i = 0;
  while (result.length < limit && typeLists.some((l) => l.length > 0)) {
    const next = typeLists[i % typeLists.length].shift();
    if (next) result.push(next.item);
    i += 1;
  }
  return result;
}
