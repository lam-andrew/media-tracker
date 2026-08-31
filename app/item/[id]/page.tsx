import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getItem } from "@/lib/queries";
import { ItemTracker } from "@/components/item/item-tracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return { title: item?.title ?? "Item" };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();
  return <ItemTracker item={item} />;
}
