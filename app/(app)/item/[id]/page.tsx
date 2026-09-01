import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/queries";
import { getProvider } from "@/lib/providers/registry";
import { deriveDetailInfo } from "@/lib/media-detail";
import { ItemTracker } from "@/components/item/item-tracker";

export const dynamic = "force-dynamic";

// Dedupe the item read across generateMetadata and the page (one DB call/request).
const loadItem = cache(getItem);

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

  // Enrich with live provider metadata (description, genres, facts). Best-effort:
  // if the provider is slow or errors, fall back to whatever was cached on add.
  let metadata = item.metadata;
  try {
    const enriched = await getProvider(item.type)?.getById(item.externalId);
    if (enriched) metadata = { ...item.metadata, ...enriched.metadata };
  } catch {
    // keep stored metadata
  }
  const detail = deriveDetailInfo(item.type, metadata);

  return <ItemTracker item={item} detail={detail} />;
}
