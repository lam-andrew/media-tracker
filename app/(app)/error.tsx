"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Error boundary for everything inside the app shell. Keeps the sidebar and
 * header alive, explains plainly, and offers a retry (re-renders the segment).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <AlertTriangle size={22} />
        </span>
        <h1 className="mt-4 font-serif text-lg text-ink">
          Something went wrong
        </h1>
        <p className="mt-1 max-w-sm text-sm text-muted">
          This page hit an error. It&rsquo;s usually temporary — try again, or
          head back to your library.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Try again
          </button>
          <Link
            href="/library"
            className="rounded-md border border-border bg-bg px-4 py-2 text-sm text-ink transition-colors hover:border-border-strong"
          >
            Back to library
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-4 text-xs text-muted">Reference: {error.digest}</p>
        ) : null}
      </div>
    </div>
  );
}
