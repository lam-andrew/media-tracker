import type { Metadata } from "next";
import { SearchView } from "@/components/search/search-view";
import { MEDIA_TYPE_KEYS } from "@/lib/media-config";
import { getOwnedMap } from "@/lib/queries";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; creator?: string }>;
}) {
  const [{ type, q, creator }, owned] = await Promise.all([
    searchParams,
    getOwnedMap(),
  ]);
  const initialType = type && MEDIA_TYPE_KEYS.includes(type) ? type : "book";
  return (
    <SearchView
      initialType={initialType}
      initialQuery={q ?? ""}
      initialCreator={creator ?? ""}
      owned={owned}
    />
  );
}
