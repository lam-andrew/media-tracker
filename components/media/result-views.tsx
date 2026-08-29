"use client";

import { Plus, Check, Loader2 } from "lucide-react";
import type { NormalizedItem } from "@/lib/providers/types";
import { getConfig } from "@/lib/media-config";

export type Layout = "grid" | "rows" | "cards";

export function itemKey(i: NormalizedItem): string {
  return `${i.externalSource}:${i.externalId}`;
}

function subtitle(item: NormalizedItem): string {
  const label = getConfig(item.type)?.label;
  return [item.creators[0], item.releaseYear, label]
    .filter(Boolean)
    .join(" · ");
}

function Cover({ item, rounded }: { item: NormalizedItem; rounded: string }) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        className={`h-full w-full object-cover ${rounded}`}
      />
    );
  }
  return (
    <div
      className={`flex h-full w-full items-center justify-center border border-border bg-surface-2 p-2 text-center text-xs text-muted ${rounded}`}
    >
      {item.title}
    </div>
  );
}

type AddState = { added: boolean; adding: boolean; onAdd: () => void };

function AddButton({ added, adding, onAdd }: AddState) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added || adding}
      className="inline-flex items-center gap-1.5 rounded-md border border-accent px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent hover:text-surface disabled:opacity-70 disabled:hover:bg-transparent disabled:hover:text-accent"
    >
      {adding ? (
        <Loader2 size={14} className="animate-spin" />
      ) : added ? (
        <Check size={14} />
      ) : (
        <Plus size={14} />
      )}
      {added ? "Added" : "Add"}
    </button>
  );
}

function CornerAdd({ added, adding, onAdd }: AddState) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added || adding}
      aria-label={added ? "Added" : "Add to library"}
      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-bg text-accent transition-colors hover:bg-accent hover:text-surface disabled:opacity-90"
    >
      {adding ? (
        <Loader2 size={15} className="animate-spin" />
      ) : added ? (
        <Check size={15} />
      ) : (
        <Plus size={15} />
      )}
    </button>
  );
}

export interface ResultsProps {
  items: NormalizedItem[];
  layout: Layout;
  addedKeys: Set<string>;
  addingKey: string | null;
  onAdd: (item: NormalizedItem) => void;
}

export function Results({
  items,
  layout,
  addedKeys,
  addingKey,
  onAdd,
}: ResultsProps) {
  const state = (item: NormalizedItem): AddState => ({
    added: addedKeys.has(itemKey(item)),
    adding: addingKey === itemKey(item),
    onAdd: () => onAdd(item),
  });

  if (layout === "grid") {
    return (
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        {items.map((item) => (
          <li key={itemKey(item)}>
            <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border">
              <Cover item={item} rounded="" />
              <CornerAdd {...state(item)} />
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-ink">{item.title}</p>
            <p className="text-xs text-muted">{subtitle(item)}</p>
          </li>
        ))}
      </ul>
    );
  }

  if (layout === "cards") {
    return (
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <li
            key={itemKey(item)}
            className="flex flex-col rounded-xl border border-border bg-surface p-2.5"
          >
            <div className="aspect-[2/3] overflow-hidden rounded-md border border-border">
              <Cover item={item} rounded="" />
            </div>
            <p className="mt-2 line-clamp-2 font-serif text-sm text-ink">
              {item.title}
            </p>
            <p className="mb-2.5 text-xs text-muted">{subtitle(item)}</p>
            <div className="mt-auto">
              <FullAddButton {...state(item)} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // rows
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li
          key={itemKey(item)}
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5"
        >
          <div className="h-16 w-11 flex-shrink-0 overflow-hidden rounded border border-border">
            <Cover item={item} rounded="" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-[15px] text-ink">
              {item.title}
            </p>
            <p className="truncate text-xs text-muted">{subtitle(item)}</p>
          </div>
          <AddButton {...state(item)} />
        </li>
      ))}
    </ul>
  );
}

function FullAddButton({ added, adding, onAdd }: AddState) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={added || adding}
      className="flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs text-surface transition-colors hover:bg-accent-strong disabled:opacity-70"
    >
      {adding ? (
        <Loader2 size={14} className="animate-spin" />
      ) : added ? (
        <Check size={14} />
      ) : (
        <Plus size={14} />
      )}
      {added ? "Added" : "Add to library"}
    </button>
  );
}
