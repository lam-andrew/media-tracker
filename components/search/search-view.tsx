"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Film,
  Tv,
  Gamepad2,
  Search as SearchIcon,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/media-config";
import type { NormalizedItem } from "@/lib/providers/types";
import { addToLibrary } from "@/lib/actions";
import { Results, itemKey, type Layout } from "@/components/media/result-views";
import { LayoutToggle } from "@/components/media/layout-toggle";

const TYPE_ICONS: Record<string, LucideIcon> = {
  book: BookOpen,
  movie: Film,
  tv: Tv,
  game: Gamepad2,
};

type SearchStatus = "idle" | "loading" | "done" | "error";

export function SearchView() {
  const [type, setType] = useState<string>("book");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NormalizedItem[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const [layout, setLayout] = useState<Layout>("rows");
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  // Restore the saved layout preference on mount.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("marqd.layout");
      if (saved === "grid" || saved === "rows" || saved === "cards") {
        // Restoring a persisted UI preference after mount is intentional and
        // hydration-safe (server renders the default, client restores the choice).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLayout(saved);
      }
    } catch {
      // ignore unavailable storage
    }
  }, []);

  function changeLayout(next: Layout) {
    setLayout(next);
    try {
      localStorage.setItem("marqd.layout", next);
    } catch {
      // ignore unavailable storage
    }
  }

  // Debounced search whenever the query or type changes. All state updates happen
  // inside timers/async callbacks, never synchronously in the effect body.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      const reset = setTimeout(() => {
        setResults([]);
        setStatus("idle");
        setError(null);
      }, 0);
      return () => clearTimeout(reset);
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/search?type=${type}&q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Search failed.");
        setResults(data.results ?? []);
        setStatus("done");
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
        setStatus("error");
        setResults([]);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, type]);

  async function onAdd(item: NormalizedItem) {
    const key = itemKey(item);
    setAddingKey(key);
    setAddError(null);
    try {
      await addToLibrary(item, "backlog");
      setAddedKeys((prev) => new Set(prev).add(key));
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddingKey(null);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-ink">Search</h1>
        <LayoutToggle value={layout} onChange={changeLayout} />
      </div>

      {/* Media-type selector */}
      <div className="mb-3 flex flex-wrap gap-2">
        {MEDIA_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t.type];
          const active = t.type === type;
          return (
            <button
              key={t.type}
              type="button"
              onClick={() => setType(t.type)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-accent text-surface"
                  : "bg-surface-2 text-muted hover:text-ink"
              }`}
            >
              {Icon ? <Icon size={15} /> : null}
              {t.labelPlural}
            </button>
          );
        })}
      </div>

      {/* Search input */}
      <label className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
        <SearchIcon size={17} className="text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${MEDIA_TYPES.find((t) => t.type === type)?.labelPlural.toLowerCase() ?? ""}…`}
          className="w-full bg-transparent text-ink placeholder:text-muted focus:outline-none"
          autoFocus
        />
        {status === "loading" ? (
          <Loader2 size={16} className="animate-spin text-muted" />
        ) : null}
      </label>

      {addError ? (
        <p className="mb-4 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-accent-strong">
          Couldn&rsquo;t add to library: {addError}
        </p>
      ) : null}

      {/* Results / states */}
      {status === "error" ? (
        <p className="py-16 text-center text-sm text-accent-strong">{error}</p>
      ) : status === "idle" ? (
        <p className="py-16 text-center text-sm text-muted">
          Search for something to add to your library.
        </p>
      ) : status === "done" && results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          No results for &ldquo;{query.trim()}&rdquo;.
        </p>
      ) : (
        <Results
          items={results}
          layout={layout}
          addedKeys={addedKeys}
          addingKey={addingKey}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}
