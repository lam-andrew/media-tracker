import Link from "next/link";
import { BRAND } from "@/lib/brand";

/**
 * App frame: a slim top nav with the serif wordmark and a search entry, wrapping
 * the page in a centered max-width container. Presentation only.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="font-serif text-2xl font-medium tracking-tight text-ink"
          >
            {BRAND.name}
          </Link>
          <Link
            href="/search"
            aria-label="Search"
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            <SearchIcon />
            <span className="hidden sm:inline">Search</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
