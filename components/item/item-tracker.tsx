"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2, Check, Heart } from "lucide-react";
import { STATUSES, type Status } from "@/lib/constants";
import { getConfig } from "@/lib/media-config";
import type { ItemDetail } from "@/lib/queries";
import { Cover } from "@/components/media/cover";
import { RatingStars } from "@/components/item/rating-stars";
import { useToast } from "@/components/toast/toast";
import {
  updateStatus,
  updateRating,
  updateProgress,
  updateNotes,
  removeFromLibrary,
  toggleFavorite,
} from "@/lib/actions";

function toInput(v: unknown): string {
  return typeof v === "number" ? String(v) : "";
}

export function ItemTracker({
  item,
  details,
}: {
  item: ItemDetail;
  /** Genres/description/facts, streamed in by the page (see ItemDetails). */
  details: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const config = getConfig(item.type);
  const kind = config?.progressKind ?? "none";

  const [status, setStatus] = useState<Status>(item.status);
  const [rating, setRating] = useState<number | null>(item.rating);
  const [favorite, setFavorite] = useState(item.favorite);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [progress, setProgress] = useState<Record<string, unknown>>(
    item.progress ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setSaving(true);
    setSavedTick(false);
    try {
      await fn();
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1500);
    } catch (err) {
      toast(`Couldn't save: ${(err as Error).message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  function changeStatus(next: Status) {
    setStatus(next);
    void run(() => updateStatus(item.id, next));
  }
  function changeRating(next: number | null) {
    setRating(next);
    void run(() => updateRating(item.id, next));
  }
  function toggleFav() {
    const next = !favorite;
    setFavorite(next);
    void run(async () => {
      await toggleFavorite(item.id, next);
      toast(next ? "Added to favorites" : "Removed from favorites", "success");
    });
  }
  function setProgressKey(key: string, value: string) {
    const n = value === "" ? undefined : Number(value);
    setProgress((p) => ({ ...p, [key]: n }));
  }
  function saveProgress() {
    void run(() => updateProgress(item.id, progress));
  }
  function saveNotes() {
    if ((item.notes ?? "") === notes) return;
    void run(() => updateNotes(item.id, notes));
  }
  async function remove() {
    if (!window.confirm(`Remove "${item.title}" from your library?`)) return;
    await removeFromLibrary(item.id);
    toast("Removed from library");
    router.push("/library");
    router.refresh();
  }

  const meta = [item.creators[0], item.releaseYear, config?.label]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Library
        </Link>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {saving ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Saving…
            </>
          ) : savedTick ? (
            <>
              <Check size={13} className="text-accent" /> Saved
            </>
          ) : null}
        </span>
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
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-3xl font-medium leading-tight text-ink">
              {item.title}
            </h1>
            <button
              type="button"
              onClick={toggleFav}
              aria-pressed={favorite}
              aria-label={
                favorite ? "Remove from favorites" : "Add to favorites"
              }
              className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-border-strong"
            >
              <Heart
                size={18}
                className={favorite ? "text-accent" : "text-muted"}
                fill={favorite ? "currentColor" : "none"}
              />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted">{meta}</p>

          {details}

          {/* Tracking */}
          <div className="mt-7 border-t border-border pt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = s === status;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => changeStatus(s)}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-accent text-surface"
                        : "bg-surface-2 text-muted hover:text-ink"
                    }`}
                  >
                    {config?.statusLabels[s] ?? s}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Rating
            </p>
            <RatingStars value={rating} onChange={changeRating} />
          </div>

          {kind !== "none" ? (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                Progress
              </p>
              {kind === "pages" ? (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <NumInput
                    value={toInput(progress.current_page)}
                    onChange={(v) => setProgressKey("current_page", v)}
                    onCommit={saveProgress}
                    placeholder="0"
                  />
                  <span className="text-muted">of</span>
                  <NumInput
                    value={toInput(progress.total_pages)}
                    onChange={(v) => setProgressKey("total_pages", v)}
                    onCommit={saveProgress}
                    placeholder="—"
                  />
                  <span className="text-muted">pages</span>
                </div>
              ) : kind === "episodes" ? (
                <div className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-muted">Season</span>
                  <NumInput
                    value={toInput(progress.season)}
                    onChange={(v) => setProgressKey("season", v)}
                    onCommit={saveProgress}
                    placeholder="1"
                  />
                  <span className="text-muted">Episode</span>
                  <NumInput
                    value={toInput(progress.episode)}
                    onChange={(v) => setProgressKey("episode", v)}
                    onCommit={saveProgress}
                    placeholder="1"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={
                      typeof progress.percent === "number"
                        ? progress.percent
                        : 0
                    }
                    onChange={(e) => setProgressKey("percent", e.target.value)}
                    onMouseUp={saveProgress}
                    onTouchEnd={saveProgress}
                    className="w-56 accent-[var(--accent)]"
                  />
                  <span className="text-sm text-ink">
                    {typeof progress.percent === "number"
                      ? progress.percent
                      : 0}
                    %
                  </span>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
              Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={saveNotes}
              rows={4}
              placeholder="Thoughts, quotes, where you left off…"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-border-strong focus:outline-none"
            />
          </div>

          <div className="mt-8 border-t border-border pt-5">
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-strong"
            >
              <Trash2 size={15} /> Remove from library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  onCommit,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-sm text-ink focus:border-border-strong focus:outline-none"
    />
  );
}
