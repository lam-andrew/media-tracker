import type { MetadataProvider, NormalizedItem } from "./types";
import { yearFrom } from "./normalize";

/**
 * TMDB provider (movies + TV). Requires a v4 API Read Access Token in
 * TMDB_ACCESS_TOKEN. Exposes two providers that share the same client.
 * https://developer.themoviedb.org/reference/intro/getting-started
 */

const BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

function posterUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}${path}` : null;
}

async function tmdbFetch(path: string): Promise<unknown> {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (!token) throw new Error("TMDB_ACCESS_TOKEN is not set");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB request failed: ${res.status}`);
  return res.json();
}

export interface TmdbMovie {
  id: number;
  title?: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
}

export interface TmdbTv {
  id: number;
  name?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
}

/** Pure mapper: a TMDB movie result → NormalizedItem. */
export function mapTmdbMovie(r: TmdbMovie): NormalizedItem {
  return {
    externalSource: "tmdb",
    externalId: String(r.id),
    type: "movie",
    title: r.title ?? "Untitled",
    creators: [],
    imageUrl: posterUrl(r.poster_path),
    releaseYear: yearFrom(r.release_date),
    metadata: { overview: r.overview ?? null },
  };
}

/** Pure mapper: a TMDB TV result → NormalizedItem. */
export function mapTmdbTv(r: TmdbTv): NormalizedItem {
  return {
    externalSource: "tmdb",
    externalId: String(r.id),
    type: "tv",
    title: r.name ?? "Untitled",
    creators: [],
    imageUrl: posterUrl(r.poster_path),
    releaseYear: yearFrom(r.first_air_date),
    metadata: { overview: r.overview ?? null },
  };
}

export const movieProvider: MetadataProvider = {
  type: "movie",
  async search(query: string): Promise<NormalizedItem[]> {
    const data = (await tmdbFetch(
      `/search/movie?include_adult=false&query=${encodeURIComponent(query)}`,
    )) as { results?: TmdbMovie[] };
    return (data.results ?? []).map(mapTmdbMovie);
  },
  async getById(externalId: string): Promise<NormalizedItem | null> {
    const r = (await tmdbFetch(`/movie/${externalId}`)) as TmdbMovie;
    return r?.id ? mapTmdbMovie(r) : null;
  },
};

export const tvProvider: MetadataProvider = {
  type: "tv",
  async search(query: string): Promise<NormalizedItem[]> {
    const data = (await tmdbFetch(
      `/search/tv?include_adult=false&query=${encodeURIComponent(query)}`,
    )) as { results?: TmdbTv[] };
    return (data.results ?? []).map(mapTmdbTv);
  },
  async getById(externalId: string): Promise<NormalizedItem | null> {
    const r = (await tmdbFetch(`/tv/${externalId}`)) as TmdbTv;
    return r?.id ? mapTmdbTv(r) : null;
  },
};
