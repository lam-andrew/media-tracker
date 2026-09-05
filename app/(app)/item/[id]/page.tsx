import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItem, type ItemDetail } from "@/lib/queries";
import { getProvider } from "@/lib/providers/registry";
import { deriveDetailInfo } from "@/lib/media-detail";
import { ItemTracker } from "@/components/item/item-tracker";
import { ItemDetails } from "@/components/item/item-details";

export const dynamic = "force-dynamic";

// Dedupe the item read across generateMetadata and the page (one DB call/request).
const loadItem = cache(getItem);

/**
 * Live provider metadata (description, genres, facts). Streams in behind a
 * Suspense boundary so the page is interactive immediately; until it lands, the
 * fallback shows the same section from the metadata cached at add-time. If the
 * provider is slow or errors, the cached version simply stays.
 */
async function EnrichedDetails({ item }: { item: ItemDetail }) {
  let metadata = item.metadata;
  try {
    const enriched = await getProvider(item.type)?.getById(item.externalId);
    if (enriched) metadata = { ...item.metadata, ...enriched.metadata };
  } catch {
    // keep stored metadata
  }
  return <ItemDetails detail={deriveDetailInfo(item.type, metadata)} />;
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
  const cached = deriveDetailInfo(item.type, item.metadata);

  return (
    <ItemTracker
      item={item}
      details={
        <Suspense fallback={<ItemDetails detail={cached} />}>
          <EnrichedDetails item={item} />
        </Suspense>
      }
    />
  );
}
