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
    cancel = useRef(false);
  const [entries, setEntries] = useState<Entry[]>([]),
    [matches, setMatches] = useState<Match[]>([]),
    [goals, setGoals] = useState<unknown[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function read(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Choose a file smaller than 5 MB.");
      return;
    }
    setBusy(true);
    setEntries([]);
    setMatches([]);
    setGoals([]);
    cancel.current = false;
    try {
      const text = await file.text();
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text);
        if (
          data.format !== "marqd-v2" ||
          !Array.isArray(data.entries) ||
          data.entries.length > 10000
        )
          throw new Error("This is not a supported library backup.");
        const rows = data.entries.map((e: unknown) => entrySchema.parse(e));
        setEntries(rows);
        setGoals(data.goals ?? []);
        setMessage(
          `${rows.length} entries ready to import. Existing entries will be skipped.`,
        );
      } else {
        const parsed = parseImportFile(text);
        if (!parsed.detected)
          throw new Error("Use a Goodreads or Letterboxd CSV export.");
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
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    setBusy(true);
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
      setMatches([]);
      setEntries([]);
    } catch (e) {
      setMessage(
        `Import stopped: ${(e as Error).message}. You can retry safely; existing entries are skipped.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="feature-panel">
      <h2>Bring your stories with you.</h2>
      <p>
        Goodreads CSV, Letterboxd CSV, or a complete v2 JSON backup. Review
        matches before saving. Existing entries are never overwritten.
      </p>
      <label className="file-picker">
        Choose an export
        <input
          type="file"
          accept=".csv,.json"
          disabled={busy}
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </label>
      <p role="status">{message}</p>
      {busy && (
        <button
          onClick={() => {
            cancel.current = true;
          }}
        >
          Stop matching after this row
        </button>
      )}
      {matches.map((m, i) => (
        <div className="import-row" key={i}>
          <span>
            {m.row.title} <small>{m.row.year}</small>
            {m.error && <small role="status"> {m.error}</small>}
          </span>
          <select
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
          </select>
        </div>
      ))}
      {(entries.length > 0 || matches.length > 0) && (
        <button className="primary" disabled={busy} onClick={commit}>
          Import selected entries
        </button>
      )}
    </section>
  );
}
