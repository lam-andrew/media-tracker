"use client";

import Link from "next/link";
import { useState } from "react";
import { Star, Heart } from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { getConfig } from "@/lib/media-config";
import { Cover } from "@/components/media/cover";
import { toggleFavorite } from "@/lib/actions";
import { useToast } from "@/components/toast/toast";

const SIZES = "(max-width: 640px) 50vw, (max-width: 768px) 33vw, 200px";

export function LibraryGrid({ items }: { items: LibraryItem[] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <LibraryCard key={item.id} item={item} />
      ))}
    </ul>
  );
}

function LibraryCard({ item }: { item: LibraryItem }) {
  const { toast } = useToast();
  const [favorite, setFavorite] = useState(item.favorite);
  const [busy, setBusy] = useState(false);
  const statusLabel =
    getConfig(item.type)?.statusLabels[item.status] ?? item.status;

  async function onHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    const next = !favorite;
    setFavorite(next);
    setBusy(true);
    try {
      await toggleFavorite(item.id, next);
      toast(next ? "Added to favorites" : "Removed from favorites", "success");
    } catch {
      setFavorite(!next);
      toast("Couldn't update favorite — try again", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <Link href={`/item/${item.id}`} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2 transition-colors group-hover:border-border-strong">
          <Cover src={item.imageUrl} title={item.title} sizes={SIZES} />
          <span className="absolute left-1.5 top-1.5 rounded-md bg-bg/90 px-2 py-0.5 text-[11px] font-medium text-accent">
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={onHeart}
            aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-bg/90 transition-colors hover:bg-bg"
          >
            <Heart
              size={14}
              className={favorite ? "text-accent" : "text-muted"}
              fill={favorite ? "currentColor" : "none"}
            />
          </button>
        </div>
        <p className="mt-1.5 line-clamp-1 text-sm text-ink">{item.title}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="line-clamp-1">
            {[item.creators[0], item.releaseYear].filter(Boolean).join(" · ")}
          </span>
          {item.rating ? (
            <span className="ml-auto flex flex-shrink-0 items-center gap-0.5 text-star">
              <Star size={11} fill="currentColor" strokeWidth={0} />
              {item.rating}
            </span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
