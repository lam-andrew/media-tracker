import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Film, Tv, Gamepad2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { bookProvider } from "@/lib/providers/book";
import type { NormalizedItem } from "@/lib/providers/types";
import { MEDIA_TYPES } from "@/lib/media-config";
import { getRecommendationFeed } from "@/lib/recommend";
import { DiscoverSearch } from "@/components/dashboard/discover-search";
import { RecRow } from "@/components/discover/rec-row";

export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  movie: Film,
  tv: Tv,
  game: Gamepad2,
};

/** Cold-start fallback when the user hasn't loved anything yet. */
async function getPopularBooks(): Promise<NormalizedItem[]> {
  try {
    const items = await bookProvider.search("award winning novels");
    return items.filter((i) => i.imageUrl).slice(0, 8);
  } catch {
    return [];
  }
}

function RecSkeleton() {
  return (
    <>
      <div className="mb-4 h-6 w-52 animate-pulse rounded bg-surface-2" />
      <ul className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="w-36 flex-shrink-0 sm:w-40">
            <div className="aspect-[2/3] animate-pulse rounded-lg border border-border bg-surface-2" />
            <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-surface-2" />
            <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-surface-2" />
          </li>
        ))}
      </ul>
    </>
  );
}

async function Recommendations() {
  const feed = await getRecommendationFeed();

  if (feed.forYou.length === 0) {
    const popular = await getPopularBooks();
    if (popular.length === 0) {
      return (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
          Rate or favorite a few things and recommendations will show up here.
        </p>
      );
    }
    return (
      <RecRow
        heading="Popular reads to get you started"
        entries={popular.map((item) => ({ item }))}
      />
    );
  }

  return (
    <div className="space-y-10">
      <RecRow heading="Recommended for you" entries={feed.forYou} />
      {feed.bySeed.map((row) => (
        <RecRow
          key={`${row.seed.externalSource}:${row.seed.externalId}`}
          eyebrow="Because you loved"
          heading={row.seed.title}
          entries={row.items.map((item) => ({ item }))}
        />
      ))}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
        Discover
      </h1>

      <div className="mt-5">
        <DiscoverSearch />
      </div>

      <section className="mt-10">
        <Suspense fallback={<RecSkeleton />}>
          <Recommendations />
        </Suspense>
      </section>

      <section className="mt-12">
        <h2 className="mb-4 font-serif text-xl text-ink">Browse by type</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {MEDIA_TYPES.map((t) => {
            const Icon = TYPE_ICONS[t.type];
            return (
              <Link
                key={t.type}
                href={`/search?type=${t.type}`}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-2 text-accent">
                  {Icon ? <Icon size={20} /> : null}
                </span>
                <span className="font-serif text-lg text-ink">
                  {t.labelPlural}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
