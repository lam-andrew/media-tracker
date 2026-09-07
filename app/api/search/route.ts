import { getProvider } from "@/lib/providers/registry";
import { rateLimit } from "@/lib/rate-limit";
import { rankResults } from "@/lib/search-rank";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?type=<book|movie|tv|game>&q=<query>
 * GET /api/search?type=<…>&creator=<name>   — everything that person/studio made
 * Runs through the registered provider for `type` and returns normalized,
 * ranked results. Provider API keys stay server-side.
 */
export async function GET(request: Request): Promise<Response> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const limited = rateLimit(`search:${ip}`, 40, 10_000);
  if (!limited.ok) {
    return Response.json(
      { error: "Too many requests — please slow down a moment." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();
  const creator = searchParams.get("creator")?.trim();

  if (!type || (!q && !creator)) {
    return Response.json(
      { error: "Missing 'type' and a 'q' or 'creator' query parameter." },
      { status: 400 },
    );
  }

  const provider = getProvider(type);
  if (!provider) {
    return Response.json(
      { error: `Unknown media type: ${type}` },
      { status: 400 },
    );
  }

  try {
    const results = creator
      ? await (provider.byCreator
          ? provider.byCreator(creator)
          : provider.search(creator))
      : await provider.search(q!);
    return Response.json({
      results: rankResults(results, creator ? undefined : q),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
