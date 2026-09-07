/**
 * Provider descriptions arrive in mixed formats: Open Library uses markdown
 * (*emphasis*, **strong**, blank-line paragraphs), Google Books may include
 * HTML (<b>, <i>, <br>, <p>), RAWG is plain text. This parses all of them into
 * a tiny, safe node tree — never raw HTML — for React to render.
 */
export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "br" };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
    const key = code.toLowerCase();
    if (key in ENTITIES) return ENTITIES[key];
    if (key.startsWith("#x"))
      return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith("#"))
      return String.fromCodePoint(parseInt(key.slice(1), 10));
    return m;
  });
}

/** Turn the HTML subset we care about into markdown, drop every other tag. */
function htmlToMarkdown(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/?p[^>]*>/gi, "\n\n")
    .replace(/<\/?(b|strong)\b[^>]*>/gi, "**")
    .replace(/<\/?(i|em)\b[^>]*>/gi, "*")
    .replace(/<[^>]+>/g, "");
}

const INLINE =
  /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])|\n/g;

function parseParagraph(p: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of p.matchAll(INLINE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ kind: "text", text: p.slice(last, idx) });
    if (m[1] !== undefined) out.push({ kind: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "em", text: m[2] });
    else if (m[3] !== undefined) out.push({ kind: "em", text: m[3] });
    else out.push({ kind: "br" });
    last = idx + m[0].length;
  }
  if (last < p.length) out.push({ kind: "text", text: p.slice(last) });
  return out;
}

/** Parse a description into paragraphs of inline nodes. Empty input → []. */
export function parseRichText(raw: string | null | undefined): Inline[][] {
  if (!raw) return [];
  const text = decodeEntities(htmlToMarkdown(raw)).replace(/\r\n?/g, "\n");
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(parseParagraph);
}

/** Plain text with formatting removed (for previews, aria, tests). */
export function toPlainText(raw: string | null | undefined): string {
  return parseRichText(raw)
    .map((p) => p.map((n) => (n.kind === "br" ? "\n" : n.text)).join(""))
    .join("\n\n");
}
