// Shown instantly on navigation while the item loads and enriches on the server.
export default function ItemLoading() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 h-5 w-20 animate-pulse rounded bg-surface-2" />

      <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
        <div className="aspect-[2/3] animate-pulse rounded-xl border border-border bg-surface-2" />

        <div>
          <div className="h-9 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-surface-2" />

          <div className="mt-4 space-y-2">
            <div className="h-3.5 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-3.5 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="mt-7 border-t border-border pt-6">
            <div className="mb-3 h-3 w-16 animate-pulse rounded bg-surface-2" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 animate-pulse rounded-md bg-surface-2"
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 h-3 w-16 animate-pulse rounded bg-surface-2" />
            <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
          </div>

          <div className="mt-6">
            <div className="mb-3 h-3 w-16 animate-pulse rounded bg-surface-2" />
            <div className="h-24 w-full animate-pulse rounded-lg bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
