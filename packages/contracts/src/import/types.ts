import type { Tracking } from "../index.js";
type Status = Tracking["status"];
export type ImportSource = "goodreads" | "letterboxd";
export interface ImportRow {
  type: string; // "book" | "movie" (from the source)
  title: string;
  creators: string[]; // author(s) for books; empty for Letterboxd
  year: number | null;
  isbn: string | null; // books only
  rating: number | null; // 0.5–5 in 0.5 steps; null when unrated
  status: Status;
  finishedAt: string | null; // ISO date "YYYY-MM-DD"
  notes: string | null;
  sourceRef: string; // e.g. Goodreads Book Id or Letterboxd URI — for dedupe/display
}
