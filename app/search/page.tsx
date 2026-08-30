import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { MEDIA_TYPE_KEYS } from "@/lib/media-config";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { type, q } = await searchParams;
  const initialType = type && MEDIA_TYPE_KEYS.includes(type) ? type : "book";
  return <SearchView initialType={initialType} initialQuery={q ?? ""} />;
}
