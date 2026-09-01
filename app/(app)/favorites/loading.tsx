import { GridSkeleton } from "@/components/library/grid-skeleton";

// Shown instantly on navigation while the favorites query runs on the server.
export default function FavoritesLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-9 w-40 animate-pulse rounded bg-surface-2 sm:h-10" />
        <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
      </div>
      <GridSkeleton count={5} />
    </div>
  );
}
