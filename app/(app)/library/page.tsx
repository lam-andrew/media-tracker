import type { Metadata } from "next";
import Link from "next/link";
import { Library, Star } from "lucide-react";
import { getLibrary } from "@/lib/queries";
import { getConfig, MEDIA_TYPES } from "@/lib/media-config";
import { Cover } from "@/components/media/cover";

const LIB_SIZES = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px";

export const metadata: Metadata = { title: "My Library" };

// The library reflects live data (it changes as you add items), so render per request.
export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const filter =
    type && MEDIA_TYPES.some((t) => t.type === type) ? type : undefined;
  const items = await getLibrary(filter);

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
          const active = tab.key === filter;
          return (
            <Link
              key={tab.label}
              href={tab.key ? `/library?type=${tab.key}` : "/library"}
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
            {filter ? "Nothing here yet" : "Your library is empty"}
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
        <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {items.map((item) => {
            const statusLabel =
              getConfig(item.type)?.statusLabels[item.status] ?? item.status;
            return (
              <li key={item.id}>
                <Link href={`/item/${item.id}`} className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2 transition-colors group-hover:border-border-strong">
                    <Cover
                      src={item.imageUrl}
                      title={item.title}
                      sizes={LIB_SIZES}
                    />
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-bg/90 px-2 py-0.5 text-[11px] font-medium text-accent">
                      {statusLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-sm text-ink">
                    {item.title}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className="line-clamp-1">
                      {[item.creators[0], item.releaseYear]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {item.rating ? (
                      <span className="ml-auto flex flex-shrink-0 items-center gap-0.5 text-star">
                        <Star size={11} fill="currentColor" strokeWidth={0} />
                        {item.rating}
                      </span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
