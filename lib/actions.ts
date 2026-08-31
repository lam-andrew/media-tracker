"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_USER_ID, type Status } from "@/lib/constants";
import type { NormalizedItem } from "@/lib/providers/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Scope every write to the single MVP user, then update. */
async function patchUserItem(
  userItemId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_items")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", userItemId)
    .eq("user_id", DEFAULT_USER_ID);
  if (error) throw new Error(error.message);
}

/**
 * Add an item to the library: upsert the shared media_items row, then attach a
 * user_items tracking record for the (single, MVP) user. Idempotent — adding the
 * same item twice is a no-op. Requires Supabase env (see .env.example); until it's
 * configured, this throws a clear error the caller surfaces.
 */
export async function addToLibrary(
  item: NormalizedItem,
  status: Status = "backlog",
): Promise<{ ok: true }> {
  const supabase = getSupabaseAdmin();

  const { data: media, error: mediaErr } = await supabase
    .from("media_items")
    .upsert(
      {
        type: item.type,
        external_source: item.externalSource,
        external_id: item.externalId,
        title: item.title,
        creators: item.creators,
        image_url: item.imageUrl,
        release_year: item.releaseYear,
        metadata: item.metadata,
      },
      { onConflict: "external_source,external_id" },
    )
    .select("id")
    .single();

  if (mediaErr || !media) {
    throw new Error(mediaErr?.message ?? "Failed to save the item.");
  }

  const { error: userErr } = await supabase.from("user_items").upsert(
    {
      user_id: DEFAULT_USER_ID,
      media_item_id: media.id,
      status,
    },
    { onConflict: "user_id,media_item_id", ignoreDuplicates: true },
  );

  if (userErr) throw new Error(userErr.message);
  return { ok: true };
}

/** Change tracking status; stamp started/finished dates on the natural transitions. */
export async function updateStatus(
  userItemId: string,
  status: Status,
): Promise<{ ok: true }> {
  const patch: Record<string, unknown> = { status };
  if (status === "in_progress") patch.started_at = today();
  if (status === "completed") patch.finished_at = today();
  await patchUserItem(userItemId, patch);
  revalidatePath("/library");
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

/** Set or clear the half-star rating (0.5–5.0, or null). */
export async function updateRating(
  userItemId: string,
  rating: number | null,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { rating });
  revalidatePath("/library");
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

/** Persist type-specific progress (pages / episodes / percent) as JSON. */
export async function updateProgress(
  userItemId: string,
  progress: Record<string, unknown>,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { progress });
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

/** Save free-text notes. */
export async function updateNotes(
  userItemId: string,
  notes: string,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { notes });
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

/** Remove an item from the library. */
export async function removeFromLibrary(
  userItemId: string,
): Promise<{ ok: true }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", userItemId)
    .eq("user_id", DEFAULT_USER_ID);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  return { ok: true };
}
