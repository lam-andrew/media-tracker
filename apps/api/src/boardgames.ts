import { XMLParser, XMLValidator } from "fast-xml-parser";
import { setTimeout as sleep } from "node:timers/promises";
import type { Media } from "../../../packages/contracts/src/index.js";
import type { Provider } from "./providers.js";

const BASE = "https://boardgamegeek.com/xmlapi2/";
class BoardGameError extends Error {
  constructor(
    message: string,
    readonly statusCode = 503,
  ) {
    super(message);
  }
}
const error = (message: string, statusCode = 503) =>
  new BoardGameError(message, statusCode);
const unavailable = () =>
  error("BoardGameGeek is temporarily unavailable. Please try again shortly.");
const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[1-9]\d{0,9}$/.test(id);
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";
const number = (value: unknown) => {
  const raw = record(value)["@_value"];
  if (typeof raw !== "string" || !/^\d{1,6}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
};
const image = (value: unknown) => {
  try {
    const url = new URL(text(value));
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return null;
    url.protocol = "https:";
    return url.href;
  } catch {
    return null;
  }
};
function mapGame(value: unknown): Media | undefined {
  const item = record(value);
  const id = item["@_id"];
  if (
    !validId(id) ||
    !["boardgame", "boardgameexpansion"].includes(text(item["@_type"]))
  )
    return;
  const names = list(item.name).map(record);
  const title = text(
    (names.find((n) => n["@_type"] === "primary") ?? names[0])?.["@_value"],
  );
  if (!title) return;
  const links = list(item.link).map(record);
  const linked = (type: string) => [
    ...new Set(
      links
        .filter((l) => l["@_type"] === type)
        .map((l) => text(l["@_value"]))
        .filter(Boolean),
    ),
  ];
  return {
    source: "bgg",
    externalId: id,
    type: "boardgame",
    title,
    creators: linked("boardgamedesigner"),
    image: image(item.image) ?? image(item.thumbnail),
    description: text(item.description),
    metadata: {
      year: number(item.yearpublished),
      minPlayers: number(item.minplayers),
      maxPlayers: number(item.maxplayers),
      playingTime: number(item.playingtime),
      minAge: number(item.minage),
      minPlayMinutes: number(item.minplaytime),
      maxPlayMinutes: number(item.maxplaytime),
      categories: linked("boardgamecategory"),
      mechanics: linked("boardgamemechanic"),
      expansion:
        item["@_type"] === "boardgameexpansion" ||
        links.some(
          (l) => l["@_type"] === "boardgamecategory" && l["@_id"] === "1042",
        ),
    },
  };
}

export interface BoardGamesOptions {
  token?: string | (() => string | undefined);
  fetch?: typeof globalThis.fetch;
  /** Clock/sleep injection keeps throttle tests deterministic without live requests. */
  now?: () => number;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  cacheSize?: number;
  cacheTtlMs?: number;
  timeoutMs?: number;
  requestTimeoutMs?: number;
}

/** XML API2: bearer auth, <=20 things per batch, >=5 seconds between starts.
 * https://boardgamegeek.com/wiki/page/BGG_XML_API2
 * https://boardgamegeek.com/using_the_xml_api
 * The queue/cache are process-local; multiple API replicas need a shared limiter.
 */
export function createBoardGames(options: BoardGamesOptions = {}): Provider {
  const fetcher = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const pause =
    options.sleep ??
    (async (ms, signal) => {
      await sleep(ms, undefined, { signal });
    });
  const cacheSize = Math.max(1, Math.min(500, options.cacheSize ?? 200));
  const ttl = Math.max(0, Math.min(3600000, options.cacheTtlMs ?? 300000));
  const timeout = Math.max(1, Math.min(15000, options.timeoutMs ?? 15000));
  const requestTimeout = Math.max(
    1,
    Math.min(5000, options.requestTimeoutMs ?? 4000),
  );
  const searches = new Map<string, { until: number; value: Media[] }>();
  const details = new Map<string, { until: number; value: Media }>();
  const inFlight = new Map<string, Promise<unknown>>();
  let queue: Promise<unknown> = Promise.resolve();
  let lastStart = -Infinity;
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    parseAttributeValue: false,
    processEntities: true,
    htmlEntities: true,
  });
  function get<T>(
    cache: Map<string, { until: number; value: T }>,
    key: string,
  ): T | undefined {
    const hit = cache.get(key);
    if (hit && hit.until > now()) return structuredClone(hit.value);
    cache.delete(key);
  }
  function put<T>(
    cache: Map<string, { until: number; value: T }>,
    key: string,
    value: T,
  ) {
    cache.delete(key);
    if (cache.size >= cacheSize) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: now() + ttl, value: structuredClone(value) });
  }
  function token() {
    const value = (
      typeof options.token === "function"
        ? options.token()
        : (options.token ?? process.env.BGG_API_TOKEN)
    )?.trim();
    if (!value)
      throw error(
        "BoardGameGeek is not configured. Set BGG_API_TOKEN on the API server to an approved BGG application token.",
      );
    if (/[\r\n]/.test(value))
      throw error(
        "BoardGameGeek token configuration is invalid. Check BGG_API_TOKEN on the API server.",
      );
    return value;
  }
  async function request(
    path: string,
    key: string,
    signal: AbortSignal,
  ): Promise<unknown[]> {
    for (let attempt = 0; attempt < 2; attempt++) {
      // Only start scheduling is serialized; fetch/body time is bounded separately.
      const slot = queue.then(async () => {
        signal.throwIfAborted();
        const delay = Math.max(0, lastStart + 5000 - now());
        if (delay) await pause(delay, signal);
        signal.throwIfAborted();
        lastStart = now();
      });
      queue = slot.catch(() => undefined);
      await slot;
      let response: Response;
      let xml: string;
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(abort, requestTimeout);
      try {
        signal.throwIfAborted();
        response = await fetcher(BASE + path, {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/xml",
          },
          signal: controller.signal,
          redirect: "error",
        });
        if ([401, 403].includes(response.status)) {
          await response.body?.cancel();
          throw error(
            "BoardGameGeek rejected the API token. Check BGG_API_TOKEN and application approval on the API server.",
          );
        }
        if (
          response.status === 202 ||
          response.status === 429 ||
          response.status >= 500
        ) {
          await response.body?.cancel();
          if (attempt === 0) continue;
          throw unavailable();
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw unavailable();
        }
        // Bound the decoded body before parsing, including chunked responses.
        const reader = response.body?.getReader();
        if (!reader) throw unavailable();
        const decoder = new TextDecoder();
        let size = 0;
        xml = "";
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            size += chunk.value.byteLength;
            if (size > 2_000_000) {
              await reader.cancel();
              throw unavailable();
            }
            xml += decoder.decode(chunk.value, { stream: true });
          }
          xml += decoder.decode();
        } finally {
          reader.releaseLock();
        }
      } catch (e) {
        // Never forward network exception messages, XML error bodies, or token values.
        if (e instanceof BoardGameError) throw e;
        if (attempt === 0 && !signal.aborted) continue;
        throw unavailable();
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
      try {
        // BGG does not need a DTD; refuse entity declarations before parsing.
        if (
          xml.includes("<!DOCTYPE") ||
          xml.includes("<!ENTITY") ||
          XMLValidator.validate(xml) !== true
        )
          throw unavailable();
        const root = record(parser.parse(xml));
        if (!("items" in root) || root.error || root.errors)
          throw unavailable();
        const items = record(root.items);
        if (items.error || items.errors) throw unavailable();
        return list(items.item);
      } catch {
        throw unavailable();
      }
    }
    throw unavailable();
  }
  async function run<T>(
    id: string,
    load: (key: string, signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const key = token();
    const existing = inFlight.get(id);
    if (existing) return structuredClone(await existing) as T;
    if (inFlight.size >= 3)
      throw error("BoardGameGeek is busy. Please try again shortly.");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(unavailable());
      }, timeout);
    });
    const work = Promise.race([load(key, controller.signal), deadline]);
    inFlight.set(id, work);
    try {
      return structuredClone(await work);
    } finally {
      clearTimeout(timer!);
      inFlight.delete(id);
    }
  }
  async function hydrate(ids: string[], key: string, signal: AbortSignal) {
    const found = new Map<string, Media>();
    for (const id of ids) {
      const cached = get(details, id);
      if (cached) found.set(id, cached);
    }
    const missing = ids.filter((id) => !found.has(id));
    if (missing.length) {
      const rows = await request("thing?id=" + missing.join(","), key, signal);
      signal.throwIfAborted();
      for (const row of rows) {
        const game = mapGame(row);
        if (game && missing.includes(game.externalId)) {
          found.set(game.externalId, game);
          put(details, game.externalId, game);
        }
      }
    }
    return ids.flatMap((id) => {
      const value = found.get(id);
      return value ? [value] : [];
    });
  }
  return {
    async search(query) {
      if (
        typeof query !== "string" ||
        query.length > 200 ||
        [...query].some((character) => character.charCodeAt(0) < 32)
      )
        throw error("Invalid board game search", 400);
      const q = query.trim();
      if (!q) return [];
      token();
      const hit = get(searches, q.toLowerCase());
      if (hit) return hit;
      return run("search:" + q.toLowerCase(), async (key, signal) => {
        const rows = await request(
          "search?type=boardgame,boardgameexpansion&query=" +
            encodeURIComponent(q),
          key,
          signal,
        );
        const ids = [
          ...new Set(
            rows
              .filter((row) =>
                ["boardgame", "boardgameexpansion"].includes(
                  text(record(row)["@_type"]),
                ),
              )
              .map((row) => record(row)["@_id"])
              .filter(validId),
          ),
        ].slice(0, 20);
        const games = await hydrate(ids, key, signal);
        signal.throwIfAborted();
        put(searches, q.toLowerCase(), games);
        return games;
      });
    },
    async get(id) {
      if (!validId(id)) throw error("Invalid board game identifier", 400);
      token();
      const hit = get(details, id);
      if (hit) return hit;
      return run("id:" + id, async (key, signal) => {
        const [game] = await hydrate([id], key, signal);
        if (!game) throw error("Board game not found", 404);
        return game;
      });
    },
  };
}

export const boardGames = createBoardGames();
