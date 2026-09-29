import {
  mediaKey,
  type Media,
  type LibraryItem,
} from "../../../packages/contracts/src/index.js";
export interface RecommendationRow {
  reason: string;
  items: Media[];
}
export function chooseSeeds(items: LibraryItem[], limit = 4) {
  const eligible = items.filter(
    (m) =>
      m.tracking.favorite ||
      (m.tracking.rating ?? 0) >= 4 ||
      m.tracking.status === "completed",
  );
  const types = new Set<string>();
  const first = eligible.filter((m) => {
    if (types.has(m.type)) return false;
    types.add(m.type);
    return true;
  });
  const chosen = new Set(first.map(mediaKey));
  return [...first, ...eligible.filter((m) => !chosen.has(mediaKey(m)))].slice(
    0,
    limit,
  );
}
export function diversify(
  rows: RecommendationRow[],
  limit = 12,
): RecommendationRow[] {
  const seen = new Set<string>();
  const groups = new Map<string, Media[]>();
  for (const row of rows)
    for (const m of row.items) {
      const key = mediaKey(m);
      if (seen.has(key)) continue;
      seen.add(key);
      const items = groups.get(m.type) ?? [];
      items.push({
        ...m,
        metadata: { ...m.metadata, recommendationReason: row.reason },
      });
      groups.set(m.type, items);
    }
  const mixed: Media[] = [];
  while (mixed.length < limit && [...groups.values()].some((g) => g.length)) {
    for (const group of groups.values()) {
      if (mixed.length >= limit) break;
      const m = group.shift();
      if (m) mixed.push(m);
    }
  }
  const used = new Set(mixed.map(mediaKey));
  return [
    ...(mixed.length
      ? [{ reason: "For you · across your collection", items: mixed }]
      : []),
    ...rows
      .map((row) => ({
        ...row,
        items: row.items.filter((m) => {
          const key = mediaKey(m);
          if (used.has(key)) return false;
          used.add(key);
          return true;
        }),
      }))
      .filter((row) => row.items.length || !mixed.length),
  ];
}
