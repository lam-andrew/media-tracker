import { getProvider } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?type=<book|movie|tv|game>&q=<query>
 * Runs the query through the registered provider for `type` and returns
 * normalized results. Provider API keys stay server-side.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q")?.trim();

  if (!type || !q) {
    return Response.json(
      { error: "Missing 'type' or 'q' query parameter." },
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
    const results = await provider.search(q);
    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
