import type { Metadata } from "next";
import { Heart } from "lucide-react";

export const metadata: Metadata = { title: "Favorites" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
        Favorites
      </h1>
      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Heart size={22} />
        </span>
        <p className="mt-4 font-serif text-lg text-ink">No favorites yet</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Mark the things you love and they&rsquo;ll gather here. Available once
          your library is live.
        </p>
      </div>
    </div>
  );
}
