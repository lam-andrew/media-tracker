"use server";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DEFAULT_USER_ID, type Status } from "@/lib/constants";
import type { NormalizedItem } from "@/lib/providers/types";

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
