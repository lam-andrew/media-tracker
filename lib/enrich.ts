import { getProvider } from "@/lib/providers/registry";
import { mergeEnrichment } from "@/lib/providers/normalize";
import type { NormalizedItem } from "@/lib/providers/types";
import { createClient } from "@/lib/supabase/server";
import type { ItemDetail } from "@/lib/queries";

const ENRICH_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(null);
      },
    );
  });
}

/** Detail lookup (creators, better art, description) — bounded, never throws. */
export async function lookupEnrichment(
  item: Pick<NormalizedItem, "type" | "externalId">,
): Promise<NormalizedItem | null> {
  const provider = getProvider(item.type);
  if (!provider) return null;
  return withTimeout(provider.getById(item.externalId), ENRICH_TIMEOUT_MS);
}

/**
 * Search results are thin stubs (no director/studio, screenshot-grade art).
 * Fill them in once at save time so the library shows real data.
 */
export async function enrichForSave(
  item: NormalizedItem,
): Promise<NormalizedItem> {
  return mergeEnrichment(item, await lookupEnrichment(item));
}

/**
 * Persist what a detail visit learned so the library grid and future visits
 * benefit. Writes only when something material changed (creators, better art,
 * a description where there was none) — never on every view.
 */
export async function persistEnrichment(
  item: ItemDetail,
  next: {
    creators: string[];
    imageUrl: string | null;
    metadata: Record<string, unknown>;
  },
): Promise<void> {
  const creatorsChanged = next.creators.join("|") !== item.creators.join("|");
  const artChanged = Boolean(next.imageUrl) && next.imageUrl !== item.imageUrl;
  const gainedDescription =
    !item.metadata.description && Boolean(next.metadata.description);
  if (!creatorsChanged && !artChanged && !gainedDescription) return;
  const supabase = await createClient();
  await supabase
    .from("media_items")
    .update({
      creators: next.creators,
      image_url: next.imageUrl,
      metadata: next.metadata,
    })
    .eq("id", item.mediaItemId);
}
