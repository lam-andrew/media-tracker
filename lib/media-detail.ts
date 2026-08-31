/** Display-ready detail derived from a media item's (enriched) metadata. */
export interface DetailInfo {
  description: string | null;
  genres: string[];
  facts: { label: string; value: string }[];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function strList(v: unknown): string[] {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string")
    : [];
}

/** Build the description / genres / type-specific facts shown on the item page. */
export function deriveDetailInfo(
  type: string,
  metadata: Record<string, unknown>,
): DetailInfo {
  const description = str(metadata.description);
  const genres = strList(metadata.genres).slice(0, 6);
  const facts: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value) facts.push({ label, value });
  };

  if (type === "book") {
    const pages = num(metadata.pageCount);
    push("Pages", pages ? String(pages) : null);
    push("ISBN", str(metadata.isbn));
  } else if (type === "movie") {
    const runtime = num(metadata.runtime);
    push("Runtime", runtime ? `${runtime} min` : null);
    push("Tagline", str(metadata.tagline));
  } else if (type === "tv") {
    const seasons = num(metadata.seasons);
    const episodes = num(metadata.episodes);
    const er = num(metadata.episodeRuntime);
    push("Seasons", seasons ? String(seasons) : null);
    push("Episodes", episodes ? String(episodes) : null);
    push("Episode length", er ? `${er} min` : null);
  } else if (type === "game") {
    const platforms = strList(metadata.platforms);
    push("Platforms", platforms.length ? platforms.join(", ") : null);
    const playtime = num(metadata.playtime);
    push("Avg. playtime", playtime ? `~${playtime} hrs` : null);
    const meta = num(metadata.metacritic);
    push("Metacritic", meta ? String(meta) : null);
  }

  return { description, genres, facts };
}
