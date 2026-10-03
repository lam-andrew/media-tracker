import { useId, useRef, useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { mediaConfig, type LibraryItem, type Tracking } from "../types";
import { Cover } from "./Cover";
import "./continue.css";

type ContinueProps = {
  items: LibraryItem[];
  busy?: boolean;
  open: (item: LibraryItem) => void;
  save: (item: LibraryItem, tracking: Tracking) => Promise<void>;
};

export function Continue({ items, open, save, busy = false }: ContinueProps) {
  const headingId = useId();
  // Keep quick-action targets in place after a save; refresh order on next visit.
  const [order] = useState(() =>
    [...items]
      .sort((a, b) => activityTime(b) - activityTime(a))
      .map((item) => item.id),
  );
  const position = (id: string) => {
    const index = order.indexOf(id);
    return index < 0 ? Infinity : index;
  };
  const active = items
    .filter((item) => item.tracking.status === "in_progress")
    .sort((a, b) => position(a.id) - position(b.id))
    .slice(0, 6);
  if (!active.length) return null;

  return (
    <section className="continue-section" aria-labelledby={headingId}>
      <div className="continue-heading">
        <div>
          <span className="continue-eyebrow">RIGHT WHERE YOU LEFT OFF</span>
          <h2 id={headingId}>Continue</h2>
        </div>
        <p>A little further, at your pace.</p>
      </div>
      <ul className="continue-track">
        {active.map((item) => (
          <ContinueCard
            key={item.id}
            item={item}
            open={open}
            save={save}
            busy={busy}
          />
        ))}
      </ul>
    </section>
  );
}

function activityTime(item: LibraryItem) {
  return Date.parse(item.updatedAt ?? item.createdAt ?? "") || 0;
}

function ContinueCard({
  item,
  busy,
  open,
  save,
}: Omit<ContinueProps, "items"> & { item: LibraryItem }) {
  const [pending, setPending] = useState<Tracking | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const saving = useRef(false);
  const config = mediaConfig[item.type];
  const tracking = pending ?? item.tracking;
  const increment = item.type === "game" ? 5 : 1;
  const isBoardGame = item.type === "boardgame";
  const canAdvance = ["book", "tv", "game"].includes(item.type);
  const total =
    item.type === "game"
      ? Math.min(tracking.total ?? 100, 100)
      : tracking.total;
  const atTotal = isBoardGame
    ? (tracking.playCount ?? 0) >= 10000000
    : tracking.current >= (total ?? 10000000);
  const action = isBoardGame
    ? "Log a play"
    : item.type === "game"
      ? "+5%"
      : item.type === "book"
        ? "+1 page"
        : "+1 episode";
  const status = config?.statuses[tracking.status] ?? "In progress";
  const progress = isBoardGame
    ? `${tracking.playCount ?? 0} ${(tracking.playCount ?? 0) === 1 ? "play" : "plays"}`
    : item.type === "game"
      ? `${tracking.current}%`
      : `${tracking.current}${total === null ? "" : ` / ${total}`} ${config?.unit ?? ""}`.trim();

  async function advance() {
    if (busy || saving.current || atTotal) return;
    const next: Tracking = isBoardGame
      ? {
          ...item.tracking,
          playCount: (item.tracking.playCount ?? 0) + 1,
          lastPlayedAt: new Date().toLocaleDateString("en-CA"),
        }
      : {
          ...item.tracking,
          current: Math.min(
            item.tracking.current + increment,
            total ?? 10000000,
          ),
        };
    saving.current = true;
    setPending(next);
    setError("");
    setFeedback("");
    try {
      await save(item, next);
      setFeedback(isBoardGame ? "Play logged." : "Progress saved.");
    } catch {
      setError(
        isBoardGame
          ? "Couldn’t log play. Try again."
          : "Couldn’t save progress. Try again.",
      );
    } finally {
      saving.current = false;
      setPending(null);
    }
  }

  return (
    <li className="continue-item-card">
      <button
        type="button"
        className="continue-open"
        onClick={() => open(item)}
        aria-label={`Open ${item.title} details`}
      >
        <span className="continue-cover">
          <Cover item={item} />
        </span>
        <span className="continue-copy">
          <span className="continue-kind">
            {config?.label ??
              (item.type === "boardgame" ? "Board games" : item.type)}
          </span>
          <span className="continue-title">{item.title}</span>
          <span className="continue-status">
            {status}
            {canAdvance || isBoardGame ? ` · ${progress}` : ""}
          </span>
        </span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </button>
      <div className="continue-footer">
        {canAdvance || isBoardGame ? (
          <button
            type="button"
            className="continue-action"
            disabled={busy || !!pending || atTotal}
            onClick={advance}
            aria-label={`${action} for ${item.title}`}
          >
            <Plus size={14} aria-hidden="true" />
            {pending ? "Saving…" : atTotal ? "Total reached" : action}
          </button>
        ) : (
          <button
            type="button"
            className="continue-action"
            disabled={busy}
            onClick={() => open(item)}
            aria-label={`Update progress for ${item.title}`}
          >
            Update progress
          </button>
        )}
        <span className="continue-feedback" role="status">
          {pending ? "Saving progress…" : feedback}
        </span>
      </div>
      {error && (
        <p className="continue-error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
