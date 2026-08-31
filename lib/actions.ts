"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type Status } from "@/lib/constants";
import type { NormalizedItem } from "@/lib/providers/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function requireUserClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

/**
 * Add an item to the signed-in user's library: upsert the shared media_items row,
 * then attach a user_items tracking record. Row-level security keeps each user's
 * tracking rows private; the shared metadata cache is readable/insertable by any
 * signed-in user. Idempotent.
 */
export async function addToLibrary(
  item: NormalizedItem,
  status: Status = "backlog",
): Promise<{ ok: true }> {
  const { supabase, user } = await requireUserClient();

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

  const { error: userErr } = await supabase
    .from("user_items")
    .upsert(
      { user_id: user.id, media_item_id: media.id, status },
      { onConflict: "user_id,media_item_id", ignoreDuplicates: true },
    );

  if (userErr) throw new Error(userErr.message);
  revalidatePath("/library");
  return { ok: true };
}

/** Update one of the user's tracking rows; RLS ensures it's theirs. */
async function patchUserItem(
  userItemId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { supabase } = await requireUserClient();
  const { error } = await supabase
    .from("user_items")
    .update({ ...patch, updated_at: nowIso() })
    .eq("id", userItemId);
  if (error) throw new Error(error.message);
}

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

export async function updateRating(
  userItemId: string,
  rating: number | null,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { rating });
  revalidatePath("/library");
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

export async function updateProgress(
  userItemId: string,
  progress: Record<string, unknown>,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { progress });
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

export async function updateNotes(
  userItemId: string,
  notes: string,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { notes });
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}

export async function removeFromLibrary(
  userItemId: string,
): Promise<{ ok: true }> {
  const { supabase } = await requireUserClient();
  const { error } = await supabase
    .from("user_items")
    .delete()
    .eq("id", userItemId);
  if (error) throw new Error(error.message);
  revalidatePath("/library");
  return { ok: true };
}

export async function toggleFavorite(
  userItemId: string,
  favorite: boolean,
): Promise<{ ok: true }> {
  await patchUserItem(userItemId, { favorite });
  revalidatePath("/library");
  revalidatePath("/favorites");
  revalidatePath(`/item/${userItemId}`);
  return { ok: true };
}
