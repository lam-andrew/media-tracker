import { BRAND } from "@/lib/brand";

/**
 * Home = the unified library. For the initial scaffold this is an on-brand empty
 * state; the poster grid, type filter, and real data land in later build tasks.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="font-serif text-4xl font-medium text-ink sm:text-5xl">
        {BRAND.name}
      </h1>
      <p className="mt-3 max-w-md text-lg text-muted">{BRAND.tagline}</p>
      <p className="mt-8 max-w-md text-sm text-muted">
        Your personal catalog of everything you&rsquo;ve read, watched, and
        played. The library grid lands here as we build it out.
      </p>
    </div>
  );
}
