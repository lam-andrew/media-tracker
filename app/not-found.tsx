import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Branded 404 for unknown URLs (outside the app shell). */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-sm text-center">
        <p className="font-serif text-4xl font-medium text-ink">{BRAND.name}</p>
        <h1 className="mt-6 font-serif text-2xl text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That page doesn&rsquo;t exist — it may have moved, or the link was
          mistyped.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
        >
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
