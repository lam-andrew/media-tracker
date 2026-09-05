"use client";

import { useState } from "react";
import type { DetailInfo } from "@/lib/media-detail";

/**
 * Genres, description, and type-specific facts for an item. The detail page
 * renders this twice: instantly from the metadata cached at add-time, then
 * again with live provider data once it streams in (see item/[id]/page.tsx) —
 * so the page never waits on a slow provider to become interactive.
 */
export function ItemDetails({ detail }: { detail: DetailInfo }) {
  const [expanded, setExpanded] = useState(false);
  const longDescription = (detail.description?.length ?? 0) > 280;

  return (
    <>
      {detail.genres.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {detail.genres.map((g) => (
            <span
              key={g}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted"
            >
              {g}
            </span>
          ))}
        </div>
      ) : null}

      {detail.description ? (
        <div className="mt-4">
          <p
            className={`text-sm leading-relaxed text-muted ${expanded ? "" : "line-clamp-5"}`}
          >
            {detail.description}
          </p>
          {longDescription ? (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 text-xs text-accent underline-offset-2 hover:underline"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {detail.facts.length ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {detail.facts.map((f) => (
            <div key={f.label}>
              <dt className="text-xs text-muted">{f.label}</dt>
              <dd className="text-sm text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
