import { GridSkeleton } from "@/components/library/grid-skeleton";

// Shown instantly on navigation while the favorites query runs on the server.
export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-9 w-40 animate-pulse rounded bg-surface-2 sm:h-10" />
        <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-16 animate-pulse rounded-full bg-surface-2"
          />
        ))}
        <div className="ml-auto flex gap-2">
          <div className="h-8 w-32 animate-pulse rounded-md bg-surface-2" />
          <div className="h-8 w-36 animate-pulse rounded-md bg-surface-2" />
        </div>
      </div>
      <GridSkeleton count={5} />
    </div>
  );
}
