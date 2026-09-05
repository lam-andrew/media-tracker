import type { Metadata } from "next";
import Link from "next/link";
import { Library } from "lucide-react";
import { getLibrary } from "@/lib/queries";
import { isStatus } from "@/lib/constants";
import { MEDIA_TYPES } from "@/lib/media-config";
import { DEFAULT_SORT, isLibrarySort, libraryHref } from "@/lib/library-view";
import { LibraryBrowser } from "@/components/library/library-browser";

export const metadata: Metadata = { title: "My Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const type =
    params.type && MEDIA_TYPES.some((t) => t.type === params.type)
      ? params.type
      : undefined;
  const status = isStatus(params.status) ? params.status : undefined;
  const sort = isLibrarySort(params.sort) ? params.sort : DEFAULT_SORT;
  const items = await getLibrary({ type });

  const tabs = [
    { key: undefined, label: "All" },
    ...MEDIA_TYPES.map((t) => ({ key: t.type, label: t.labelPlural })),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
          My Library
        </h1>
        <span className="text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === type;
          return (
            <Link
              key={tab.label}
              href={libraryHref("/library", { type: tab.key, status, sort })}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-accent text-surface"
                  : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Library size={22} />
          </span>
          <p className="mt-4 font-serif text-lg text-ink">
            {type ? "Nothing here yet" : "Your library is empty"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Search for a book, movie, show, or game and add it — your collection
            gathers here.
          </p>
          <Link
            href="/search"
            className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Find something to add
          </Link>
        </div>
      ) : (
        <LibraryBrowser
          items={items}
          basePath="/library"
          type={type}
          initialStatus={status}
          initialSort={sort}
        />
      )}
    </div>
  );
}
