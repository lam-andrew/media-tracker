"use client";

import Link from "next/link";
import { useState } from "react";
import type { NormalizedItem } from "@/lib/providers/types";
import { getConfig } from "@/lib/media-config";
import { addToLibrary } from "@/lib/actions";
import { Cover } from "@/components/media/cover";
import { CornerAdd, itemKey } from "@/components/media/result-views";
import { useToast } from "@/components/toast/toast";

export interface RecEntry {
  item: NormalizedItem;
  /** Seed title that explains this pick ("Because you loved …"). */
  because?: string;
}

/**
 * A horizontal row of recommended titles. Each card can be added to the
 * library right here (no detour through search); the poster links to a search
 * for the title for anyone who wants to look first.
 */
export function RecRow({
  heading,
  eyebrow,
  entries,
}: {
  heading: string;
  eyebrow?: string;
  entries: RecEntry[];
}) {
  const { toast } = useToast();
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  async function onAdd(item: NormalizedItem) {
    const key = itemKey(item);
    setAdding(key);
    try {
      await addToLibrary(item, "backlog");
      setAdded((prev) => new Set(prev).add(key));
      toast("Added to your library", "success");
    } catch (err) {
      toast(`Couldn't add: ${(err as Error).message}`, "error");
    } finally {
      setAdding(null);
    }
  }

  return (
    <section>
      {eyebrow ? (
        <p className="text-xs uppercase tracking-wider text-muted">{eyebrow}</p>
      ) : null}
      <h2 className="mb-4 font-serif text-xl text-ink">{heading}</h2>
      <ul className="flex gap-4 overflow-x-auto pb-2">
        {entries.map(({ item, because }) => {
          const key = itemKey(item);
          const sub = because
            ? `Because you loved ${because}`
            : (item.creators[0] ?? getConfig(item.type)?.label ?? "");
          return (
            <li key={key} className="w-36 flex-shrink-0 sm:w-40">
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-surface-2">
                <Link
                  href={`/search?type=${item.type}&q=${encodeURIComponent(item.title)}`}
                  className="absolute inset-0"
                  aria-label={`Look up ${item.title}`}
                >
                  <Cover src={item.imageUrl} title={item.title} sizes="160px" />
                </Link>
                <CornerAdd
                  added={added.has(key)}
                  adding={adding === key}
                  onAdd={() => onAdd(item)}
                />
              </div>
              <p className="mt-2 line-clamp-1 text-sm text-ink">{item.title}</p>
              <p className="line-clamp-1 text-xs text-muted" title={sub}>
                {sub}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
