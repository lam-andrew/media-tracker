import type { Status } from "./constants";

/**
 * Per-media-type configuration. Everything type-specific is DATA here — labels,
 * status wording, and how progress is measured — so adding a media type is a new
 * entry plus a provider, with no changes to schema or shared UI. See ADR 0002.
 */
export type ProgressKind = "pages" | "episodes" | "percent" | "none";

export interface MediaTypeConfig {
  type: string;
  label: string; // "Book"
  labelPlural: string; // "Books"
  icon: string; // lucide icon name, resolved by the UI layer
  statusLabels: Record<Status, string>;
  progressKind: ProgressKind;
}

export const MEDIA_TYPES: MediaTypeConfig[] = [
  {
    type: "book",
    label: "Book",
    labelPlural: "Books",
    icon: "BookOpen",
    statusLabels: {
      backlog: "Want to read",
      in_progress: "Reading",
      completed: "Read",
      abandoned: "DNF",
    },
    progressKind: "pages",
  },
  {
    type: "movie",
    label: "Movie",
    labelPlural: "Movies",
    icon: "Film",
    statusLabels: {
      backlog: "Want to watch",
      in_progress: "Watching",
      completed: "Watched",
      abandoned: "Abandoned",
    },
    progressKind: "none",
  },
  {
    type: "tv",
    label: "TV",
    labelPlural: "TV shows",
    icon: "Tv",
    statusLabels: {
      backlog: "Want to watch",
      in_progress: "Watching",
      completed: "Watched",
      abandoned: "Dropped",
    },
    progressKind: "episodes",
  },
  {
    type: "game",
    label: "Game",
    labelPlural: "Games",
    icon: "Gamepad2",
    statusLabels: {
      backlog: "Want to play",
      in_progress: "Playing",
      completed: "Played",
      abandoned: "Dropped",
    },
    progressKind: "percent",
  },
];

export function getConfig(type: string): MediaTypeConfig | undefined {
  return MEDIA_TYPES.find((t) => t.type === type);
}

/** The media types the app currently supports, in display order. */
export const MEDIA_TYPE_KEYS = MEDIA_TYPES.map((t) => t.type);
