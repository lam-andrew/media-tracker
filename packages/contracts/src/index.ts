import { z } from "zod";
export const BRAND = { name: "Marqd" };
export const credentialsSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(12).max(128),
});
export const trackingSchema = z
  .object({
    status: z.enum(["backlog", "in_progress", "completed", "abandoned"]),
    rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable(),
    favorite: z.boolean(),
    current: z.number().int().min(0).max(10000000),
    total: z.number().int().min(1).max(10000000).nullable(),
    notes: z.string().max(10000),
    startedAt: z.iso.date().nullable().optional(),
    season: z.number().int().min(0).max(10000).nullable().optional(),
    finishedAt: z.iso.date().nullable().optional(),
  })
  .refine((v) => v.total === null || v.current <= v.total, {
    message: "Progress cannot exceed the total.",
    path: ["current"],
  });
export type Tracking = z.infer<typeof trackingSchema>;
export interface Media {
  source: string;
  externalId: string;
  type: string;
  title: string;
  creators: string[];
  image: string | null;
  description: string;
  metadata: Record<string, unknown>;
}
export interface LibraryItem extends Media {
  id: string;
  version: number;
  tracking: Tracking;
  createdAt?: string;
}
export interface User {
  id: string;
  email: string;
}
export const mediaConfig: Record<
  string,
  {
    label: string;
    unit: string;
    source: string;
    totalKey: string;
    statuses: Record<Tracking["status"], string>;
  }
> = {
  book: {
    label: "Books",
    unit: "pages",
    source: "openlibrary",
    totalKey: "pages",
    statuses: {
      backlog: "Want to read",
      in_progress: "Reading",
      completed: "Read",
      abandoned: "DNF",
    },
  },
  movie: {
    label: "Movies",
    unit: "",
    source: "tmdb",
    totalKey: "",
    statuses: {
      backlog: "Want to watch",
      in_progress: "Watching",
      completed: "Watched",
      abandoned: "Abandoned",
    },
  },
  tv: {
    label: "TV shows",
    unit: "episodes",
    source: "tmdb",
    totalKey: "",
    statuses: {
      backlog: "Want to watch",
      in_progress: "Watching",
      completed: "Watched",
      abandoned: "Dropped",
    },
  },
  game: {
    label: "Games",
    unit: "percent",
    source: "rawg",
    totalKey: "completion",
    statuses: {
      backlog: "Want to play",
      in_progress: "Playing",
      completed: "Played",
      abandoned: "Dropped",
    },
  },
};
export const mediaKey = (m: Media) => `${m.type}:${m.source}:${m.externalId}`;
export const mediaSchema = z.object({
  source: z.string().min(1).max(80),
  externalId: z.string().min(1).max(150),
  type: z.enum(["book", "movie", "tv", "game"]),
  title: z.string().min(1).max(1000),
  creators: z.array(z.string().max(500)).max(100),
  image: z
    .url()
    .refine((v) => /^https?:/.test(v))
    .nullable(),
  description: z.string().max(100000),
  metadata: z.record(z.string(), z.unknown()),
});
export const entrySchema = z.object({
  media: mediaSchema,
  tracking: trackingSchema,
  createdAt: z.iso.datetime().optional(),
});
export interface Goal {
  type: string;
  year: number;
  target: number;
}
export const progressPercent = (t: Tracking) =>
  t.total ? Math.min(100, Math.round((t.current / t.total) * 100)) : 0;
