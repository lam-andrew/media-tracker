"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { STATUSES, type Status } from "@/lib/constants";
import { getConfig } from "@/lib/media-config";
import type { LibraryItem } from "@/lib/queries";
import {
  DEFAULT_SORT,
  LIBRARY_SORTS,
  SORT_LABELS,
  filterLibrary,
  libraryHref,
  sortLibrary,
  type LibrarySort,
} from "@/lib/library-view";
import { LibraryGrid } from "./library-grid";

/** Labels when no single media type is selected (types word statuses differently). */
const GENERIC_STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Dropped",
};

/**
 * Status filter, sort, and a text filter over an already-loaded library page.
 * Everything here is instant — it works on the items the server already sent —
 * and status/sort are mirrored into the URL (History API, no round-trip) so a
 * view is shareable and survives refresh; the page seeds them back as `initial*`.
 */
export function LibraryBrowser({
  items,
  basePath,
  type,
  initialStatus,
  initialSort,
}: {
  items: LibraryItem[];
  basePath: string;
  type?: string;
  initialStatus?: Status;
  initialSort?: LibrarySort;
}) {
  const [status, setStatus] = useState<Status | undefined>(initialStatus);
  const [sort, setSort] = useState<LibrarySort>(initialSort ?? DEFAULT_SORT);
  const [q, setQ] = useState("");

  const labels = getConfig(type ?? "")?.statusLabels ?? GENERIC_STATUS_LABELS;
  const byStatus = status ? items.filter((i) => i.status === status) : items;
  const visible = sortLibrary(filterLibrary(byStatus, q), sort);
  const narrowed = visible.length !== items.length;

  function sync(next: { status?: Status; sort?: LibrarySort }) {
    // Next.js integrates with the native History API, so this updates the URL
    // (and useSearchParams) without a server navigation.
    window.history.replaceState(
      window.history.state,
      "",
      libraryHref(basePath, { type, ...next }),
    );
  }
  function changeStatus(next?: Status) {
    setStatus(next);
    sync({ status: next, sort });
  }
  function changeSort(next: LibrarySort) {
    setSort(next);
    sync({ status, sort: next });
  }

  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs transition-colors ${
      active
        ? "bg-accent text-surface"
        : "bg-surface-2 text-muted hover:text-ink"
    }`;

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Filter by status"
        >
          <button
            type="button"
            onClick={() => changeStatus(undefined)}
            aria-pressed={!status}
            className={chip(!status)}
          >
            Any status
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeStatus(s)}
              aria-pressed={status === s}
              className={chip(status === s)}
            >
              {labels[s]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {narrowed ? (
            <span className="text-xs text-muted">
              {visible.length} of {items.length}
            </span>
          ) : null}
          <label className="sr-only" htmlFor="library-sort">
            Sort by
          </label>
          <select
            id="library-sort"
            value={sort}
            onChange={(e) => changeSort(e.target.value as LibrarySort)}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-border-strong focus:outline-none"
          >
            {LIBRARY_SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 focus-within:border-border-strong">
            <Search size={14} className="text-muted" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter…"
              aria-label="Filter by title or creator"
              className="w-28 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none sm:w-40"
            />
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-lg border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
          {q.trim() ? (
            <>No items match &ldquo;{q.trim()}&rdquo;.</>
          ) : (
            <>
              Nothing marked &ldquo;{status ? labels[status] : ""}&rdquo; yet.
            </>
          )}
        </p>
      ) : (
        <LibraryGrid items={visible} />
      )}
    </>
  );
}
