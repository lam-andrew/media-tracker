// Shown instantly on navigation while the stats queries run on the server.
export default function StatsLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-9 w-32 animate-pulse rounded bg-surface-2 sm:h-10" />
        <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
      </div>

      {/* This year: tiles */}
      <div className="mt-10 h-6 w-28 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-xl border border-border bg-surface-2"
          />
        ))}
      </div>

      {/* Goals */}
      <div className="mt-10 h-6 w-36 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-32 animate-pulse rounded-xl border border-border bg-surface-2" />

      {/* Bars */}
      <div className="mt-10 h-6 w-48 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-56 animate-pulse rounded-xl border border-border bg-surface-2" />

      {/* Table */}
      <div className="mt-10 h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="mt-4 h-48 animate-pulse rounded-xl border border-border bg-surface-2" />
    </div>
  );
}
