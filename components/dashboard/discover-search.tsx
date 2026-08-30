"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/media-config";

/**
 * The Discover-page search bar: a media-type dropdown, a text field, and a button
 * that routes to /search with the query pre-filled.
 */
export function DiscoverSearch() {
  const router = useRouter();
  const [type, setType] = useState("book");
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push(`/search?type=${type}`);
      return;
    }
    router.push(`/search?type=${type}&q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-2 sm:flex-row sm:items-center"
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        aria-label="Category"
        className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40 sm:w-40"
      >
        {MEDIA_TYPES.map((t) => (
          <option key={t.type} value={t.type}>
            {t.labelPlural}
          </option>
        ))}
      </select>

      <div className="flex flex-1 items-center gap-2 px-2">
        <Search size={17} className="text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find something you like…"
          className="w-full bg-transparent py-2 text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-accent px-6 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
      >
        Search
      </button>
    </form>
  );
}
