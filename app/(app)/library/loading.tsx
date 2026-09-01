import { GridSkeleton } from "@/components/library/grid-skeleton";

// Shown instantly on navigation while the library query runs on the server.
export default function LibraryLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <div className="h-9 w-48 animate-pulse rounded bg-surface-2 sm:h-10" />
        <div className="h-4 w-14 animate-pulse rounded bg-surface-2" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 animate-pulse rounded-md bg-surface-2"
          />
        ))}
      </div>
      <GridSkeleton />
    </div>
  );
}
