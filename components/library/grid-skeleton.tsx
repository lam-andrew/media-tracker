/**
 * Poster-grid placeholder shown while a library/favorites page streams in.
 * Mirrors the real `LibraryGrid` layout so there's no shift when data arrives.
 */
export function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[2/3] animate-pulse rounded-lg border border-border bg-surface-2" />
          <div className="mt-1.5 h-3.5 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="mt-1 h-3 w-1/2 animate-pulse rounded bg-surface-2" />
        </li>
      ))}
    </ul>
  );
}
