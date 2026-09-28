import { Select } from "./Select";
import {
  BookOpen,
  Film,
  Archive,
  Upload,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { BRAND } from "../types";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { entrySchema, type Media, type Tracking } from "../types";
import {
  parseImportFile,
  toImportRows,
} from "../../../../packages/contracts/src/import/index";
import { titleSimilarity } from "../../../../packages/contracts/src/import/similarity";
import type { ImportRow } from "../../../../packages/contracts/src/import/types";
type Entry = { media: Media; tracking: Tracking; createdAt?: string };
type Match = {
  row: ImportRow;
  options: Media[];
  selected: string;
  error?: string;
};
export function Import() {
  const qc = useQueryClient(),
    cancel = useRef(false),
    fileInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState("goodreads"),
    [fileName, setFileName] = useState(""),
    [dragging, setDragging] = useState(false),
    [phase, setPhase] = useState<
      "choose" | "matching" | "review" | "saving" | "done"
    >("choose");
  const sources = [
    {
      id: "goodreads",
      name: "Goodreads",
      detail: "Books, ratings & reading history",
      icon: BookOpen,
    },
    {
      id: "letterboxd",
      name: "Letterboxd",
      detail: "Films, ratings & diary entries",
      icon: Film,
    },
    {
      id: "backup",
      name: `${BRAND.name} backup`,
      detail: "Your complete library & goals",
      icon: Archive,
    },
  ];
  const [entries, setEntries] = useState<Entry[]>([]),
    [matches, setMatches] = useState<Match[]>([]),
    [goals, setGoals] = useState<unknown[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const selectedCount =
    entries.length || matches.filter((m) => m.selected).length;
  async function read(file?: File) {
    if (!file || busy) return;
    setMessage("");
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Choose a file smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setFileName(file.name);
    setPhase("matching");
    setEntries([]);
    setMatches([]);
    setGoals([]);
    cancel.current = false;
    try {
      const text = await file.text();
      if (file.name.toLowerCase().endsWith(".json")) {
        const data = JSON.parse(text);
        if (
          data.format !== "marqd-v2" ||
          !Array.isArray(data.entries) ||
          data.entries.length > 10000
        )
          throw new Error("This is not a supported library backup.");
        const rows = data.entries.map((e: unknown) => entrySchema.parse(e));
        setSource("backup");
        setEntries(rows);
        setGoals(data.goals ?? []);
        setMessage(
          `${rows.length} entries ready to import. Existing entries will be skipped.`,
        );
      } else {
        const parsed = parseImportFile(text);
        if (!parsed.detected)
          throw new Error("Use a Goodreads or Letterboxd CSV export.");
        setSource(parsed.detected);
        const rows = toImportRows(parsed.detected, parsed.objects);
        if (rows.length > 1000)
          throw new Error(
            "Split CSV exports into files of at most 1,000 rows.",
          );
        const found: Match[] = [];
        for (const row of rows) {
          if (cancel.current) break;
          if (found.length)
            await new Promise((resolve) => setTimeout(resolve, 1100));
          if (cancel.current) break;
          setMessage(`Matching ${found.length + 1} of ${rows.length}…`);
          let options: Media[] = [];
          let matchError: string | undefined;
          try {
            options = await api<Media[]>(
              `/search?type=${row.type}&q=${encodeURIComponent(row.isbn || row.title)}`,
            );
            if (!options.length && row.isbn)
              options = await api<Media[]>(
                `/search?type=${row.type}&q=${encodeURIComponent(row.title)}`,
              );
          } catch (e) {
            matchError = (e as Error).message;
          }
          const exact = options.find(
            (m) =>
              titleSimilarity(m.title, row.title) >= 0.98 &&
              (!row.year || !m.metadata.year || m.metadata.year === row.year),
          );
          found.push({
            row,
            options: options.slice(0, 8),
            selected: exact?.externalId ?? "",
            error: matchError,
          });
          setMatches([...found]);
        }
        setMessage(
          "Review each match, then import the selected entries. Unmatched rows are skipped.",
        );
      }
      setPhase("review");
    } catch (e) {
      setPhase("choose");
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
    setPhase("saving");
    setMessage("Importing…");
    try {
      const chosen: Entry[] = entries.length
        ? entries
        : matches.flatMap((m) => {
            const media = m.options.find((o) => o.externalId === m.selected);
            if (!media) return [];
            return [
              {
                media,
                tracking: {
                  status: m.row.status,
                  rating: m.row.rating,
                  favorite: false,
                  current: 0,
                  total: null,
                  notes: m.row.notes ?? "",
                  finishedAt: m.row.finishedAt,
                },
              },
            ];
          });
      let added = 0,
        skipped = 0;
      for (let i = 0; i < Math.max(1, chosen.length); i += 10) {
        const result = await api<{ added: number; skipped: number }>(
          "/import",
          {
            method: "POST",
            body: JSON.stringify({
              entries: chosen.slice(i, i + 10),
              goals: i === 0 ? goals : undefined,
            }),
          },
        );
        added += result.added;
        skipped += result.skipped;
        setMessage(`Imported ${added}; skipped ${skipped} existing entries…`);
      }
      await qc.invalidateQueries({ queryKey: ["library"] });
      await qc.invalidateQueries({ queryKey: ["goals"] });
      setMessage(
        `Done. Imported ${added}; skipped ${skipped} existing entries.`,
      );
      setPhase("done");
      setMatches([]);
      setEntries([]);
      setGoals([]);
    } catch (e) {
      setPhase("review");
      setMessage(
        `Import stopped: ${(e as Error).message}. You can retry safely; existing entries are skipped.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="import-workspace">
      <p className="import-intro">
        Keep the history. Start a new chapter. Bring your existing collection
        into {BRAND.name}.
      </p>
      <ol className="import-steps" aria-label="Import progress">
        {["Choose a file", "Review matches", "Add to library"].map(
          (step, i) => (
            <li
              key={step}
              aria-current={
                (phase === "choose" || phase === "matching"
                  ? 0
                  : phase === "review"
                    ? 1
                    : 2) === i
                  ? "step"
                  : undefined
              }
            >
              <span>{i + 1}</span>
              {step}
            </li>
          ),
        )}
      </ol>
      <div className="import-layout">
        <div className="import-main">
          <h2>Where are your stories?</h2>
          <div className="import-sources" aria-label="Import source">
            {sources.map(({ id, name, detail, icon: Icon }) => (
              <button
                key={id}
                disabled={busy}
                aria-pressed={source === id}
                onClick={() => setSource(id)}
              >
                <Icon size={22} />
                <strong>{name}</strong>
                <small>{detail}</small>
                <span className="source-check">
                  {source === id && <CheckCircle2 size={17} />}
                </span>
              </button>
            ))}
          </div>
          <div
            className={`import-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!busy) void read(e.dataTransfer.files[0]);
            }}
            aria-busy={busy}
          >
            <div className="upload-symbol">
              {fileName ? <FileCheck size={28} /> : <Upload size={28} />}
            </div>
            <h3>{fileName || "A home for your collection"}</h3>
            <p>
              {busy
                ? "Working through your stories…"
                : "Drop your export here, or choose a file to get started."}
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {fileName ? "Choose another file" : "Choose a file"}
              <ArrowRight size={16} />
            </button>
            <input
              ref={fileInput}
              className="visually-hidden"
              aria-label="Choose an export"
              type="file"
              tabIndex={-1}
              accept={source === "backup" ? ".json" : ".csv"}
              disabled={busy}
              onChange={(e) => {
                void read(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <small>
              {source === "backup" ? "JSON backup" : "CSV export"} · Up to 5 MB
            </small>
          </div>
        </div>
        <aside className="import-guide">
          <span className="eyebrow">A little preparation</span>
          <h2>
            {source === "goodreads"
              ? "From your bookshelves."
              : source === "letterboxd"
                ? "From your film diary."
                : "Back where you left off."}
          </h2>
          <p>
            {source === "goodreads"
              ? "In Goodreads, open My Books → Import and export, then export your library and download the CSV."
              : source === "letterboxd"
                ? "In Letterboxd, open Settings → Import & Export. Unzip your export and choose a CSV, such as ratings or diary."
                : `Choose the JSON file downloaded from ${BRAND.name}’s Export library menu. Your entries and goals travel together.`}
          </p>
          <div className="import-assurance">
            <ShieldCheck size={20} />
            <div>
              <strong>Your library stays yours.</strong>
              <p>
                Review before saving. Existing entries are skipped, never
                overwritten.
              </p>
            </div>
          </div>
          <small>
            CSV files: up to 1,000 rows per import. Larger libraries can be
            imported in batches.
          </small>
        </aside>
      </div>
      {message && (
        <div
          className={`import-message ${phase === "done" ? "complete" : ""}`}
          role="status"
        >
          {phase === "done" && <CheckCircle2 size={20} />}
          <span>{message}</span>
          {phase === "matching" && (
            <button
              onClick={() => {
                cancel.current = true;
              }}
            >
              Stop matching
            </button>
          )}
        </div>
      )}
      {(entries.length > 0 || matches.length > 0 || goals.length > 0) && (
        <div className="import-review">
          <div className="import-review-heading">
            <div>
              <h2>Review your collection</h2>
              <p>
                {selectedCount} selected
                {goals.length ? ` · ${goals.length} goals` : ""}. Skip any match
                that doesn’t look right.
              </p>
            </div>
            <button
              className="primary"
              disabled={busy || (!selectedCount && !goals.length)}
              onClick={commit}
            >
              Import {selectedCount} {selectedCount === 1 ? "entry" : "entries"}
              <ArrowRight size={16} />
            </button>
          </div>
          {matches.map((m, i) => (
            <div className="import-row" key={i}>
              <span>
                {m.row.title} <small>{m.row.year}</small>
                {m.error && <small role="status"> {m.error}</small>}
              </span>
              <Select
                aria-label={`Match ${m.row.title}`}
                value={m.selected}
                disabled={busy}
                onChange={(e) =>
                  setMatches((old) =>
                    old.map((o, j) =>
                      j === i ? { ...o, selected: e.target.value } : o,
                    ),
                  )
                }
              >
                <option value="">Skip / no match</option>
                {m.options.map((o) => (
                  <option key={o.externalId} value={o.externalId}>
                    {o.title} {String(o.metadata.year ?? "")} ·{" "}
                    {o.creators.join(", ")}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          {entries.length > 0 && (
            <p className="backup-summary">
              <Archive size={20} /> Your backup is validated and ready. Ratings,
              progress, notes, and favorites are included.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
