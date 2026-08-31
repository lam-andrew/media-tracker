import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_USER_ID, type Status } from "@/lib/constants";

/** A saved library entry: the user's tracking record joined with item metadata. */
export interface LibraryItem {
  id: string; // user_items.id
  status: Status;
  rating: number | null;
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
  media_item_id: string;
  media_items: {
    type: string;
    title: string;
    image_url: string | null;
    release_year: number | null;
    creators: string[] | null;
  } | null;
};

/** Fetch the (single MVP) user's library, newest first, optionally filtered by type. */
export async function getLibrary(typeFilter?: string): Promise<LibraryItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_items")
    .select(
      "id, status, rating, media_item_id, media_items(type, title, image_url, release_year, creators)",
    )
    .eq("user_id", DEFAULT_USER_ID)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data as unknown as RawRow[] | null) ?? [];
  return rows
    .filter(
      (r): r is RawRow & { media_items: NonNullable<RawRow["media_items"]> } =>
        Boolean(r.media_items),
    )
    .filter((r) => !typeFilter || r.media_items.type === typeFilter)
    .map((r) => ({
      id: r.id,
      status: r.status,
      rating: r.rating,
      mediaItemId: r.media_item_id,
      type: r.media_items.type,
      title: r.media_items.title,
      imageUrl: r.media_items.image_url,
      releaseYear: r.media_items.release_year,
      creators: r.media_items.creators ?? [],
    }));
}
