"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, FileUp, Loader2, Star, TriangleAlert } from "lucide-react";
import { getConfig } from "@/lib/media-config";
import { parseImportFile, toImportRows } from "@/lib/import";
import {
  COMMIT_CHUNK,
  IMPORT_SOURCES,
  MATCH_CHUNK,
  sourceLabel,
  type ImportEntry,
  type ImportRow,
  type ImportSource,
} from "@/lib/import/types";
import type { MatchResult } from "@/lib/import/match";
import { commitImport, matchImportRows } from "@/lib/import-actions";
import { Cover } from "@/components/media/cover";
import { useToast } from "@/components/toast/toast";

type Step = "choose" | "preview" | "matching" | "review" | "done";

const PREVIEW_ROWS = 10;

function statusLabel(row: ImportRow): string {
  return getConfig(row.type)?.statusLabels[row.status] ?? row.status;
}

function Rating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <Star size={12} className="fill-star text-star" />
      {value}
    </span>
  );
}

function Thumb({ src, title }: { src: string | null; title: string }) {
  return (
    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded border border-border bg-surface-2">
      <Cover src={src} title={title} sizes="40px" />
    </div>
  );
}

function ResultRow({
  r,
  i,
  checked,
  onToggle,
}: {
  r: MatchResult;
  i: number;
  checked: boolean;
  onToggle: (index: number) => void;
}) {
  const id = `import-row-${i}`;
  const rowMeta =
    (r.row.creators[0] ? ` · ${r.row.creators[0]}` : "") +
    (r.row.year ? ` · ${r.row.year}` : "");
  return (
    <li className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={!r.item}
        onChange={() => onToggle(i)}
        className="h-4 w-4 shrink-0 accent-accent"
      />
      {r.item ? (
        <Thumb src={r.item.imageUrl} title={r.item.title} />
      ) : (
        <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded border border-dashed border-border text-muted">
          <TriangleAlert size={14} />
        </div>
      )}
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        {r.item ? (
          <>
            <p className="truncate text-sm text-ink">
              {r.item.title}
              {r.item.releaseYear ? (
                <span className="text-muted"> · {r.item.releaseYear}</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted">
              {r.confidence === "exact"
                ? "Exact match"
                : r.confidence === "likely"
                  ? "Likely match"
                  : "Best guess"}{" "}
              for &ldquo;{r.row.title}&rdquo;
              {rowMeta}
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-sm text-ink">{r.row.title}</p>
            <p className="truncate text-xs text-muted">
              No match found{rowMeta}
            </p>
          </>
        )}
      </label>
      <div className="hidden shrink-0 text-right text-xs text-muted sm:block">
        <p>{statusLabel(r.row)}</p>
        <Rating value={r.row.rating} />
      </div>
    </li>
  );
}

const primaryBtn =
  "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";
const secondaryBtn =
  "inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm text-ink transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-60";

export function ImportWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("choose");
  const [fileName, setFileName] = useState<string | null>(null);
  const [objects, setObjects] = useState<Record<string, string>[]>([]);
  const [detected, setDetected] = useState<ImportSource | null>(null);
  const [source, setSource] = useState<ImportSource | "">("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [included, setIncluded] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState<{
    added: number;
    skipped: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const cancelRef = useRef(false);

  function reset() {
    cancelRef.current = true;
    setStep("choose");
    setFileName(null);
    setObjects([]);
    setDetected(null);
    setSource("");
    setRows([]);
    setResults([]);
    setMatchError(null);
    setIncluded(new Set());
    setImporting(false);
    setOutcome(null);
  }

  async function loadFile(file: File) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      toast("Couldn't read that file.", "error");
      return;
    }
    const parsed = parseImportFile(text);
    if (parsed.objects.length === 0) {
      toast("That file has no rows.", "error");
      return;
    }
    setFileName(file.name);
    setObjects(parsed.objects);
    setDetected(parsed.detected);
    setSource(parsed.detected ?? "");
    setRows(
      parsed.detected ? toImportRows(parsed.detected, parsed.objects) : [],
    );
    setResults([]);
    setStep("preview");
  }

  function chooseSource(next: ImportSource | "") {
    setSource(next);
    setRows(next ? toImportRows(next, objects) : []);
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void loadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  }

  async function runMatching(from: number) {
    cancelRef.current = false;
    setStep("matching");
    setMatchError(null);
    const acc = results.slice(0, from);
    try {
      for (let i = from; i < rows.length; i += MATCH_CHUNK) {
        const chunk = rows.slice(i, i + MATCH_CHUNK);
        const matched = await matchImportRows(chunk);
        if (cancelRef.current) return;
        acc.push(...matched);
        setResults([...acc]);
      }
    } catch (err) {
      if (cancelRef.current) return;
      setResults([...acc]);
      setMatchError((err as Error).message);
      toast("Matching stopped early — you can retry.", "error");
      return;
    }
    const defaults = new Set<number>();
    acc.forEach((r, i) => {
      if (r.item && r.confidence !== "none") defaults.add(i);
    });
    setIncluded(defaults);
    setStep("review");
  }

  function toggle(index: number) {
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function runImport() {
    const entries: ImportEntry[] = [];
    included.forEach((i) => {
      const r = results[i];
      if (!r?.item) return;
      entries.push({
        item: r.item,
        status: r.row.status,
        rating: r.row.rating,
        finishedAt: r.row.finishedAt,
        notes: r.row.notes,
      });
    });
    if (entries.length === 0) return;
    setImporting(true);
    let added = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < entries.length; i += COMMIT_CHUNK) {
        const res = await commitImport(entries.slice(i, i + COMMIT_CHUNK));
        added += res.added;
        skipped += res.skipped;
      }
    } catch (err) {
      setImporting(false);
      toast(
        `Import failed after ${added} item${added === 1 ? "" : "s"}: ${(err as Error).message}`,
        "error",
      );
      return;
    }
    setImporting(false);
    setOutcome({ added, skipped });
    setStep("done");
    toast(
      `Imported ${added} item${added === 1 ? "" : "s"}` +
        (skipped > 0 ? ` (${skipped} already in your library)` : ""),
      "success",
    );
  }

  // ---- Step: choose file -------------------------------------------------
  if (step === "choose") {
    return (
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-surface px-6 py-16 text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg ${
          dragging
            ? "border-accent"
            : "border-border hover:border-border-strong"
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <FileUp size={22} />
        </span>
        <span className="mt-4 font-serif text-lg text-ink">
          Drop a CSV here, or click to choose
        </span>
        <span className="mt-1 text-sm text-muted">
          Goodreads or Letterboxd exports are detected automatically.
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={onFileInput}
          className="sr-only"
        />
      </label>
    );
  }

  const sourceName = source ? sourceLabel(source) : null;

  // ---- Step: preview -----------------------------------------------------
  if (step === "preview") {
    return (
      <section className="rounded-xl border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{fileName}</p>
            <p className="text-sm text-muted">
              {source
                ? `${rows.length} ${rows.length === 1 ? "row" : "rows"} detected from ${sourceName}`
                : `${objects.length} rows — couldn't tell which service this is from.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {detected === null ? (
              <label className="flex items-center gap-2 text-sm text-muted">
                Source
                <select
                  value={source}
                  onChange={(e) =>
                    chooseSource(e.target.value as ImportSource | "")
                  }
                  className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-ink focus:border-border-strong focus:outline-none"
                >
                  <option value="">Choose…</option>
                  {IMPORT_SOURCES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="button" onClick={reset} className={secondaryBtn}>
              Start over
            </button>
          </div>
        </header>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 text-right font-medium">Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                  <tr
                    key={`${row.sourceRef}-${i}`}
                    className="border-t border-border"
                  >
                    <td className="max-w-xs truncate px-5 py-2 text-ink">
                      {row.title}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {[row.creators[0], row.year].filter(Boolean).join(" · ")}
                    </td>
                    <td className="px-3 py-2 text-muted">{statusLabel(row)}</td>
                    <td className="px-5 py-2 text-right">
                      <Rating value={row.rating} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : source ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            No usable rows found for {sourceName}.
          </p>
        ) : null}

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="text-sm text-muted">
            {rows.length > PREVIEW_ROWS
              ? `Showing ${PREVIEW_ROWS} of ${rows.length}.`
              : ""}
          </p>
          <button
            type="button"
            onClick={() => runMatching(0)}
            disabled={rows.length === 0}
            className={primaryBtn}
          >
            Match titles
          </button>
        </footer>
      </section>
    );
  }

  // ---- Step: matching ----------------------------------------------------
  if (step === "matching") {
    const pct = rows.length
      ? Math.round((results.length / rows.length) * 100)
      : 0;
    return (
      <section className="rounded-xl border border-border bg-surface px-5 py-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink">
            {matchError ? "Matching stopped" : "Matching titles…"}
          </p>
          <p className="text-sm text-muted" aria-live="polite">
            matched {results.length} of {rows.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={rows.length}
          aria-valuenow={results.length}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {matchError ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-accent-strong">{matchError}</p>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className={secondaryBtn}>
                Start over
              </button>
              <button
                type="button"
                onClick={() => runMatching(results.length)}
                className={primaryBtn}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Loader2 size={15} className="animate-spin" />
            Looking each title up — this can take a moment for large exports.
          </div>
        )}
      </section>
    );
  }

  // ---- Step: done --------------------------------------------------------
  if (step === "done" && outcome) {
    return (
      <section className="flex flex-col items-center rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
          <Check size={22} />
        </span>
        <p className="mt-4 font-serif text-lg text-ink">
          Imported {outcome.added} {outcome.added === 1 ? "item" : "items"}
        </p>
        {outcome.skipped > 0 ? (
          <p className="mt-1 text-sm text-muted">
            {outcome.skipped} {outcome.skipped === 1 ? "was" : "were"} already
            in your library and left untouched.
          </p>
        ) : null}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={reset} className={secondaryBtn}>
            Import another file
          </button>
          <Link href="/library" className={primaryBtn}>
            Go to your library
          </Link>
        </div>
      </section>
    );
  }

  // ---- Step: review ------------------------------------------------------
  const matched = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.item && r.confidence !== "none");
  const review = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.item || r.confidence === "none");
  const selectedCount = included.size;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm text-ink">
              {matched.length} matched · {review.length} need
              {review.length === 1 ? "s" : ""} review
            </p>
            <p className="text-sm text-muted">
              {selectedCount} of {rows.length} selected to import from{" "}
              {sourceName}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              className={secondaryBtn}
            >
              Start over
            </button>
            <button
              type="button"
              onClick={runImport}
              disabled={importing || selectedCount === 0}
              className={primaryBtn}
            >
              {importing ? (
                <Loader2 size={15} className="animate-spin" />
              ) : null}
              Import {selectedCount} {selectedCount === 1 ? "item" : "items"}
            </button>
          </div>
        </header>
      </section>

      {matched.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
            Matched ({matched.length})
          </h2>
          <ul className="rounded-xl border border-border bg-surface">
            {matched.map(({ r, i }) => (
              <ResultRow
                key={i}
                r={r}
                i={i}
                checked={included.has(i)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {review.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted">
            Needs review ({review.length})
          </h2>
          <p className="mb-3 text-sm text-muted">
            These didn&rsquo;t match confidently. Tick a best guess to import it
            anyway, or add them by hand from Search later.
          </p>
          <ul className="rounded-xl border border-border bg-surface">
            {review.map(({ r, i }) => (
              <ResultRow
                key={i}
                r={r}
                i={i}
                checked={included.has(i)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
