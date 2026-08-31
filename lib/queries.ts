import { createClient } from "@/lib/supabase/server";
import { type Status } from "@/lib/constants";

/** A saved library entry: the user's tracking record joined with item metadata. */
export interface LibraryItem {
  id: string; // user_items.id
  status: Status;
  rating: number | null;
  favorite: boolean;
  mediaItemId: string;
  type: string;
  title: string;
  imageUrl: string | null;
  releaseYear: number | null;
  creators: string[];
}

type RawRow = {
  id: string;
  status: Status;
  rating: number | null;
  favorite: boolean | null;
  media_item_id: string;
  media_items: {
    type: string;
    title: string;
    image_url: string | null;
    release_year: number | null;
    creators: string[] | null;
  } | null;
};

/** Fetch the signed-in user's library (RLS scopes it), newest first. */
export async function getLibrary(opts?: {
  type?: string;
  favoritesOnly?: boolean;
}): Promise<LibraryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_items")
    .select(
      "id, status, rating, favorite, media_item_id, media_items(type, title, image_url, release_year, creators)",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data as unknown as RawRow[] | null) ?? [];
  return rows
    .filter(
      (r): r is RawRow & { media_items: NonNullable<RawRow["media_items"]> } =>
        Boolean(r.media_items),
    )
    .filter((r) => !opts?.type || r.media_items.type === opts.type)
    .filter((r) => !opts?.favoritesOnly || r.favorite === true)
    .map((r) => ({
      id: r.id,
      status: r.status,
      rating: r.rating,
      favorite: r.favorite ?? false,
      mediaItemId: r.media_item_id,
      type: r.media_items.type,
      title: r.media_items.title,
      imageUrl: r.media_items.image_url,
      releaseYear: r.media_items.release_year,
      creators: r.media_items.creators ?? [],
    }));
}

/** A single library item with full tracking + metadata, for the detail view. */
export interface ItemDetail {
  id: string;
  status: Status;
  rating: number | null;
  favorite: boolean;
  progress: Record<string, unknown>;
  notes: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  type: string;
  title: string;
  imageUrl: string | null;
  releaseYear: number | null;
  creators: string[];
  externalSource: string;
  externalId: string;
  metadata: Record<string, unknown>;
}

type RawItemRow = {
  id: string;
  status: Status;
  rating: number | null;
  favorite: boolean | null;
  progress: Record<string, unknown> | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  media_items: {
    type: string;
    title: string;
    image_url: string | null;
    release_year: number | null;
    creators: string[] | null;
    external_source: string;
    external_id: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

/** Fetch one of the user's library items by its user_items id (RLS scopes it). */
export async function getItem(userItemId: string): Promise<ItemDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_items")
    .select(
      "id, status, rating, favorite, progress, notes, started_at, finished_at, media_items(type, title, image_url, release_year, creators, external_source, external_id, metadata)",
    )
    .eq("id", userItemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as unknown as RawItemRow | null;
  if (!row || !row.media_items) return null;

  return {
    id: row.id,
    status: row.status,
    rating: row.rating,
    favorite: row.favorite ?? false,
    progress: row.progress ?? {},
    notes: row.notes,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    type: row.media_items.type,
    title: row.media_items.title,
    imageUrl: row.media_items.image_url,
    releaseYear: row.media_items.release_year,
    creators: row.media_items.creators ?? [],
    externalSource: row.media_items.external_source,
    externalId: row.media_items.external_id,
    metadata: row.media_items.metadata ?? {},
  };
}
