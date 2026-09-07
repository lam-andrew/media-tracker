"use client";

import Link from "next/link";
import { Plus, Check, Loader2 } from "lucide-react";
import type { NormalizedItem } from "@/lib/providers/types";
import { getConfig } from "@/lib/media-config";
import { Cover } from "@/components/media/cover";
import { creatorHref, mediaHref } from "@/lib/search-links";

export type Layout = "grid" | "rows" | "cards";

export function itemKey(i: NormalizedItem): string {
  return `${i.externalSource}:${i.externalId}`;
}

/** Where a result leads: its own item page if owned, else the detail preview. */
function detailHref(item: NormalizedItem, ownedId?: string): string {
  return ownedId ? `/item/${ownedId}` : mediaHref(item.type, item.externalId);
}

/** "Creator · year · type" — the creator links to everything else they made. */
function Subtitle({
  item,
  className,
}: {
  item: NormalizedItem;
  className: string;
}) {
  const creator = item.creators[0];
  const rest = [item.releaseYear, getConfig(item.type)?.label]
    .filter(Boolean)
    .join(" · ");
  return (
    <p className={className}>
      {creator ? (
        <>
          <Link
            href={creatorHref(item.type, creator)}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {creator}
          </Link>
          {rest ? " · " : null}
        </>
      ) : null}
      {rest}
    </p>
  );
}

type AddState = { ownedId?: string; adding: boolean; onAdd: () => void };

function AddButton({ ownedId, adding, onAdd }: AddState) {
  if (ownedId) {
    return (
      <Link
        href={`/item/${ownedId}`}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <Check size={14} className="text-accent" /> In library
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent hover:text-surface disabled:opacity-70"
    >
      {adding ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Plus size={14} />
      )}
      Add
    </button>
  );
}

/** Poster-corner add button; shared with the Discover recommendation rows. */
export function CornerAdd({ ownedId, adding, onAdd }: AddState) {
  const base =
    "absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg transition-colors";
  if (ownedId) {
    return (
      <Link
        href={`/item/${ownedId}`}
        aria-label="In your library — open"
        title="In your library"
        className={`${base} text-accent`}
      >
        <Check size={15} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      aria-label="Add to library"
      className={`${base} text-accent hover:bg-accent hover:text-surface disabled:opacity-90`}
    >
      {adding ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Plus size={15} />
      )}
    </button>
  );
}

function FullAddButton({ ownedId, adding, onAdd }: AddState) {
  if (ownedId) {
    return (
      <Link
        href={`/item/${ownedId}`}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs text-muted transition-colors hover:text-ink"
      >
        <Check size={14} className="text-accent" /> In your library
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs text-surface transition-colors hover:bg-accent-strong disabled:opacity-70"
    >
      {adding ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Plus size={14} />
      )}
      Add to library
    </button>
  );
}

export interface ResultsProps {
  items: NormalizedItem[];
  layout: Layout;
  /** "source:id" → user_items.id for results already in the library. */
  owned: Record<string, string>;
  addingKey: string | null;
  onAdd: (item: NormalizedItem) => void;
}

const GRID_SIZES = "(max-width: 640px) 33vw, (max-width: 768px) 25vw, 200px";
const CARD_SIZES = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 220px";

export function Results({
  items,
  layout,
  owned,
  addingKey,
  onAdd,
}: ResultsProps) {
  const state = (item: NormalizedItem): AddState => ({
    ownedId: owned[itemKey(item)],
    adding: addingKey === itemKey(item),
    onAdd: () => onAdd(item),
  });

  if (layout === "grid") {
    return (
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => {
          const s = state(item);
          const href = detailHref(item, s.ownedId);
          return (
            <li key={itemKey(item)}>
              <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface-2 transition-colors hover:border-border-strong">
                <Link
                  href={href}
                  className="absolute inset-0"
                  aria-label={`View ${item.title}`}
                >
                  <Cover
                    src={item.imageUrl}
                    title={item.title}
                    sizes={GRID_SIZES}
                  />
                </Link>
                <CornerAdd {...s} />
              </div>
              <Link
                href={href}
                className="mt-1.5 block line-clamp-2 text-sm text-ink hover:underline underline-offset-2"
              >
                {item.title}
              </Link>
              <Subtitle item={item} className="text-xs text-muted" />
            </li>
          );
        })}
      </ul>
    );
  }

  if (layout === "cards") {
    return (
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => {
          const s = state(item);
          const href = detailHref(item, s.ownedId);
          return (
            <li
              key={itemKey(item)}
              className="flex flex-col rounded-xl border border-border bg-surface p-2.5"
            >
              <Link
                href={href}
                className="relative block aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface-2 transition-colors hover:border-border-strong"
                aria-label={`View ${item.title}`}
              >
                <Cover
                  src={item.imageUrl}
                  title={item.title}
                  sizes={CARD_SIZES}
                />
              </Link>
              <Link
                href={href}
                className="mt-2 line-clamp-2 font-serif text-sm text-ink hover:underline underline-offset-2"
              >
                {item.title}
              </Link>
              <Subtitle item={item} className="mb-2.5 text-xs text-muted" />
              <div className="mt-auto">
                <FullAddButton {...s} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  // rows
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const s = state(item);
        const href = detailHref(item, s.ownedId);
        return (
          <li
            key={itemKey(item)}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5"
          >
            <Link
              href={href}
              className="relative block h-16 w-11 flex-shrink-0 overflow-hidden rounded border border-border bg-surface-2"
              aria-label={`View ${item.title}`}
            >
              <Cover src={item.imageUrl} title={item.title} sizes="44px" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={href}
                className="block truncate font-serif text-[15px] text-ink hover:underline underline-offset-2"
              >
                {item.title}
              </Link>
              <Subtitle item={item} className="truncate text-xs text-muted" />
            </div>
            <AddButton {...s} />
          </li>
        );
      })}
    </ul>
  );
}
