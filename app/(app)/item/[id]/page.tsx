import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItem, type ItemDetail } from "@/lib/queries";
import { lookupEnrichment, persistEnrichment } from "@/lib/enrich";
import { deriveDetailInfo } from "@/lib/media-detail";
import { ItemTracker } from "@/components/item/item-tracker";
import { ItemDetails } from "@/components/item/item-details";

export const dynamic = "force-dynamic";

// Dedupe the item read across generateMetadata and the page (one DB call/request).
const loadItem = cache(getItem);

/**
 * Live provider metadata (credits, description, genres, facts, better art).
 * Streams in behind a Suspense boundary so the page is interactive immediately;
 * until it lands, the fallback shows the same section from the metadata cached
 * at add-time. Whatever we learn is written back to the shared cache so the
 * library grid and future visits benefit. If the provider is slow or errors,
 * the cached version simply stays.
 */
async function EnrichedDetails({ item }: { item: ItemDetail }) {
  let metadata = item.metadata;
  let creators = item.creators;
  const enriched = await lookupEnrichment(item);
  if (enriched) {
    metadata = { ...item.metadata, ...enriched.metadata };
    if (enriched.creators.length) creators = enriched.creators;
    try {
      await persistEnrichment(item, {
        creators,
        imageUrl: enriched.imageUrl ?? item.imageUrl,
        metadata,
      });
    } catch {
      // cache refresh is best-effort
    }
  }
  return (
    <ItemDetails
      type={item.type}
      detail={deriveDetailInfo(item.type, metadata, creators)}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await loadItem(id);
  return { title: item?.title ?? "Item" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await loadItem(id);
  if (!item) notFound();

  // Render instantly from cached metadata; live enrichment streams in after.
  const cached = deriveDetailInfo(item.type, item.metadata, item.creators);

  return (
    <ItemTracker
      item={item}
      details={
        <Suspense fallback={<ItemDetails type={item.type} detail={cached} />}>
          <EnrichedDetails item={item} />
        </Suspense>
      }
    />
  );
}
