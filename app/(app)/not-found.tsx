import Link from "next/link";
import { SearchX } from "lucide-react";

/** In-shell 404, e.g. an item id that isn't in this user's library. */
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <SearchX size={22} />
        </span>
        <h1 className="mt-4 font-serif text-lg text-ink">
          Not in your library
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          This item doesn&rsquo;t exist or isn&rsquo;t yours — it may have been
          removed.
        </p>
        <Link
          href="/library"
          className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
        >
          Back to your library
        </Link>
      </div>
    </div>
  );
}
