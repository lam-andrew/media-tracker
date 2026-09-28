import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, Check } from "lucide-react";
import {
  type Media,
  type LibraryItem,
  type Tracking,
  trackingSchema,
  mediaConfig,
} from "../types";
import { Cover } from "./Cover";
import { RichText } from "./RichText";
import { api } from "../api";
export function Detail({
  media,
  item,
  close,
  add,
  save,
  busy,
  error,
  remove,
  byCreator,
}: {
  media: Media;
  item?: LibraryItem;
  close: () => void;
  add: (m: Media, status: Tracking["status"]) => Promise<void>;
  save: (item: LibraryItem, tracking: Tracking) => Promise<void>;
  busy: boolean;
  error: string;
  remove?: (item: LibraryItem) => Promise<void>;
  byCreator?: (name: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Tracking>(
    item?.tracking ?? {
      status: "backlog",
      rating: null,
      favorite: false,
      current: 0,
      total:
        typeof media.metadata.pages === "number" ? media.metadata.pages : null,
      notes: "",
    },
  );
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [validation, setValidation] = useState("");
  const enrichment = useQuery({
    queryKey: ["detail", media.type, media.externalId],
    queryFn: ({ signal }) =>
      api<Media>(
        `/media?type=${media.type}&source=${media.source}&id=${encodeURIComponent(media.externalId)}`,
        {
          signal,
        },
      ),
    enabled: !item || !media.description,
    staleTime: 300000,
    retry: false,
  });
  const display = enrichment.data ?? media;
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  function patch<K extends keyof Tracking>(key: K, value: Tracking[K]) {
    setDraft({
      ...draft,
      [key]: value,
      ...(key === "status" && value === "completed" && !draft.finishedAt
        ? { finishedAt: new Date().toISOString().slice(0, 10) }
        : {}),
    });
  }
  return (
    <dialog
      ref={dialog}
      aria-label={`${media.title} details`}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else close();
      }}
      onClick={(e) => {
        if (e.target === dialog.current && !busy) close();
      }}
    >
      <div className="detail">
        <button
          autoFocus
          disabled={busy}
          className="close round"
          aria-label="Close story"
          onClick={close}
        >
          <X size={20} />
        </button>
        <div className="detail-stage">
          <div className="detail-glow" />
          <Cover item={display} />
          <p>A world of its own.</p>
        </div>
        <div className="detail-copy">
          <span className="eyebrow">
            {mediaConfig[media.type]?.label ?? media.type}
          </span>
          <h2>{media.title}</h2>
          <div className="byline">
            {display.creators.map((name) => (
              <button key={name} onClick={() => byCreator?.(name)}>
                {name}
              </button>
            ))}
          </div>
          <div className="media-facts">
            {Object.entries(display.metadata)
              .filter(
                ([k, v]) =>
                  [
                    "year",
                    "genres",
                    "platforms",
                    "runtime",
                    "seasons",
                    "episodes",
                    "metacritic",
                    "publishers",
                  ].includes(k) && v != null,
              )
              .map(([k, v]) => (
                <span key={k}>
                  {k}: {Array.isArray(v) ? v.join(", ") : String(v)}
                </span>
              ))}
          </div>
          <RichText
            text={
              display.description ||
              (enrichment.isFetching
                ? "Loading description…"
                : "No description available.")
            }
          />
          {enrichment.isError && (
            <p className="inline-warning">
              The description couldn’t load. Your tracking is still available.
            </p>
          )}
          <label className="form-field">
            Status
            <select
              disabled={busy}
              value={draft.status}
              onChange={(e) =>
                patch("status", e.target.value as Tracking["status"])
              }
            >
              {Object.entries(mediaConfig[media.type].statuses).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          {item ? (
            <>
              <label className="form-field">
                Your rating
                <select
                  disabled={busy}
                  value={draft.rating ?? ""}
                  onChange={(e) =>
                    patch(
                      "rating",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Not rated</option>
                  {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map(
                    (n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ),
                  )}
                </select>
              </label>
              {mediaConfig[media.type].unit && (
                <div className="progress-fields">
                  <label className="form-field">
                    Current {mediaConfig[media.type]?.unit ?? "progress"}
                    <input
                      disabled={busy}
                      type="number"
                      min="0"
                      value={draft.current}
                      onChange={(e) => patch("current", Number(e.target.value))}
                    />
                  </label>
                  <label className="form-field">
                    Total (optional)
                    <input
                      disabled={busy}
                      type="number"
                      min="1"
                      value={draft.total ?? ""}
                      onChange={(e) =>
                        patch(
                          "total",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </label>
                </div>
              )}
              <label className="form-field">
                Date finished
                <input
                  type="date"
                  value={draft.finishedAt ?? ""}
                  disabled={busy}
                  onChange={(e) => patch("finishedAt", e.target.value || null)}
                />
              </label>
              {media.type === "tv" && (
                <label className="form-field">
                  Current season
                  <input
                    type="number"
                    min={0}
                    value={draft.season ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      patch(
                        "season",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </label>
              )}
              <label className="form-field">
                Date started
                <input
                  type="date"
                  value={draft.startedAt ?? ""}
                  disabled={busy}
                  onChange={(e) => patch("startedAt", e.target.value || null)}
                />
              </label>
              <label className="favorite-check">
                <input
                  disabled={busy}
                  type="checkbox"
                  checked={draft.favorite}
                  onChange={(e) => patch("favorite", e.target.checked)}
                />{" "}
                Keep as a favorite
              </label>
              <label className="notes">
                <span className="eyebrow">IN THE MARGINS</span>
                <textarea
                  disabled={busy}
                  maxLength={10000}
                  value={draft.notes}
                  placeholder="A thought worth keeping…"
                  onChange={(e) => patch("notes", e.target.value)}
                />
              </label>
              <button
                className="primary save-button"
                disabled={busy}
                onClick={async () => {
                  const parsed = trackingSchema.safeParse(draft);
                  if (!parsed.success) {
                    setValidation(parsed.error.issues[0].message);
                    return;
                  }
                  setValidation("");
                  await save(item, parsed.data);
                }}
              >
                <Check size={16} />
                {busy ? "Saving…" : "Save changes"}
              </button>
              {remove &&
                (confirmRemove ? (
                  <div className="delete-confirm">
                    <p>Remove this story and its tracking from your library?</p>
                    <button disabled={busy} onClick={() => remove(item)}>
                      Confirm removal
                    </button>
                    <button onClick={() => setConfirmRemove(false)}>
                      Keep story
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmRemove(true)}>
                    Remove from library
                  </button>
                ))}
            </>
          ) : (
            <button
              disabled={busy}
              className="primary save-button"
              onClick={() => add(display, draft.status)}
            >
              <Plus size={16} />
              {busy ? "Adding…" : "Add to collection"}
            </button>
          )}
          {(error || validation) && (
            <p role="alert" className="error">
              {error || validation}
            </p>
          )}
        </div>
      </div>
    </dialog>
  );
}
