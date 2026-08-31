import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getLibrary } from "@/lib/queries";
import { LibraryGrid } from "@/components/library/library-grid";

export const metadata: Metadata = { title: "Favorites" };
export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const items = await getLibrary({ favoritesOnly: true });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
          Favorites
        </h1>
        <span className="text-sm text-muted">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <Heart size={22} />
          </span>
          <p className="mt-4 font-serif text-lg text-ink">No favorites yet</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Tap the heart on any item — in your library or on its detail page —
            and it gathers here.
          </p>
          <Link
            href="/library"
            className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Go to your library
          </Link>
        </div>
      ) : (
        <LibraryGrid items={items} />
      )}
    </div>
  );
}
