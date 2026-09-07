"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { STATUSES, type Status } from "@/lib/constants";
import { getConfig } from "@/lib/media-config";
import type { NormalizedItem } from "@/lib/providers/types";
import type { DetailInfo } from "@/lib/media-detail";
import { addToLibrary } from "@/lib/actions";
import { Cover } from "@/components/media/cover";
import { ItemDetails } from "@/components/item/item-details";
import { useToast } from "@/components/toast/toast";

/** Same layout as the item page, minus tracking — plus "add as …" buttons. */
export function MediaPreview({
  item,
  detail,
}: {
  item: NormalizedItem;
  detail: DetailInfo;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const config = getConfig(item.type);
  const [pending, setPending] = useState<Status | null>(null);

  async function add(status: Status) {
    setPending(status);
    try {
      const { id } = await addToLibrary(item, status);
      toast("Added to your library", "success");
      router.push(`/item/${id}`);
    } catch (err) {
      toast(`Couldn't add: ${(err as Error).message}`, "error");
      setPending(null);
    }
  }

  const meta = [item.releaseYear, config?.label].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link
          href={`/search?type=${encodeURIComponent(item.type)}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Search
        </Link>
      </div>

      <div className="grid gap-8 sm:grid-cols-[220px_1fr]">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface-2">
            <Cover
              src={item.imageUrl}
              title={item.title}
              sizes="220px"
              priority
            />
          </div>
        </div>

        <div>
          <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
            {item.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{meta}</p>

          <ItemDetails type={item.type} detail={detail} />

          <div className="mt-7 border-t border-border pt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Add to your library as
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => add(s)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-70 ${
                    s === "backlog"
                      ? "bg-accent text-surface hover:bg-accent-strong"
                      : "bg-surface-2 text-muted hover:text-ink"
                  }`}
                >
                  {pending === s ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  {config?.statusLabels[s] ?? s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
