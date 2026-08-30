import type { Metadata } from "next";
import { Library } from "lucide-react";

export const metadata: Metadata = { title: "My Library" };

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
        My Library
      </h1>
      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Library size={22} />
        </span>
        <p className="mt-4 font-serif text-lg text-ink">
          Your library is empty
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Items you add from search will live here — across books, movies, TV,
          and games. Saving turns on once the database is connected.
        </p>
      </div>
    </div>
  );
}
