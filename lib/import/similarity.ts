/**
 * Title similarity for matching imported rows to provider search results.
 * Normalizes both sides (lowercase, strip punctuation and leading articles,
 * collapse whitespace) and returns a Dice coefficient over word tokens (0..1).
 */

const ARTICLES = new Set(["the", "a", "an"]);

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation → space
    .split(/\s+/)
    .filter((w) => w.length > 0 && !ARTICLES.has(w))
    .join(" ");
}

function tokens(title: string): string[] {
  const norm = normalizeTitle(title);
  return norm ? norm.split(" ") : [];
}

/** Dice coefficient over unique word tokens. 1 = identical, 0 = disjoint. */
export function titleSimilarity(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let overlap = 0;
  for (const t of ta) if (tb.has(t)) overlap += 1;
  return (2 * overlap) / (ta.size + tb.size);
}
