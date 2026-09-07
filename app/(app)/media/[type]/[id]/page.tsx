import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProvider } from "@/lib/providers/registry";
import { findOwnedId } from "@/lib/queries";
import { deriveDetailInfo } from "@/lib/media-detail";
import { MediaPreview } from "@/components/media/media-preview";

export const dynamic = "force-dynamic";

/**
 * Detail preview for anything from search or Discover that isn't in the
 * library yet — credits, genres, description, facts — with an "add as…" CTA.
 * If it turns out to be in the library already, go to its item page instead.
 */
const load = cache(async (type: string, id: string) => {
  const provider = getProvider(type);
  return provider ? provider.getById(id) : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}): Promise<Metadata> {
  const { type, id } = await params;
  const item = await load(type, decodeURIComponent(id));
  return { title: item?.title ?? "Preview" };
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id: raw } = await params;
  if (!getProvider(type)) notFound();
  const item = await load(type, decodeURIComponent(raw));
  if (!item) notFound();

  const ownedId = await findOwnedId(item.externalSource, item.externalId);
  if (ownedId) redirect(`/item/${ownedId}`);

  return (
    <MediaPreview
      item={item}
      detail={deriveDetailInfo(item.type, item.metadata, item.creators)}
    />
  );
}
