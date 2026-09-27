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
}
export interface User {
  id: string;
  email: string;
}
export const mediaConfig: Record<string, { label: string; unit: string }> = {
  book: { label: "Books", unit: "pages" },
  movie: { label: "Movies", unit: "minutes" },
  tv: { label: "TV", unit: "episodes" },
  game: { label: "Games", unit: "hours" },
};
export const mediaKey = (m: Media) => `${m.source}:${m.externalId}`;
export const progressPercent = (t: Tracking) =>
  t.total ? Math.min(100, Math.round((t.current / t.total) * 100)) : 0;
