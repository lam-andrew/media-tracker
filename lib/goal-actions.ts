"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";
import { MEDIA_TYPES } from "@/lib/media-config";

// Server-side bounds (a "use server" module may export only async functions).
const GOAL_YEAR_MIN = 2000;
const GOAL_YEAR_MAX = 2100;
const GOAL_TARGET_MAX = 10000;

async function requireUserClient() {
  const supabase = await createClient();
  const user = await getSessionUser();
  if (!user) throw new Error("You must be signed in.");
  return { supabase, user };
}

function assertInt(value: unknown, min: number, max: number, what: string) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${what} must be a whole number between ${min} and ${max}.`,
    );
  }
}

/**
 * Create or replace the signed-in user's target for (year, type). `type` null
 * means "all media". Upserts on the table's unique key, which treats NULL
 * types as equal (nulls not distinct), so re-saving "all media" replaces it.
 */
export async function setGoal(
  year: number,
  type: string | null,
  target: number,
): Promise<{ ok: true }> {
  assertInt(year, GOAL_YEAR_MIN, GOAL_YEAR_MAX, "Year");
  assertInt(target, 1, GOAL_TARGET_MAX, "Target");
  if (type !== null && !MEDIA_TYPES.some((t) => t.type === type)) {
    throw new Error("Unknown media type.");
  }

  const { supabase, user } = await requireUserClient();
  const { error } = await supabase.from("user_goals").upsert(
    {
      user_id: user.id,
      year,
      type,
      target,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,year,type" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/stats");
  return { ok: true };
}

/** Delete one of the signed-in user's goals; RLS ensures it's theirs. */
export async function removeGoal(id: string): Promise<{ ok: true }> {
  if (typeof id !== "string" || !id) throw new Error("Missing goal id.");
  const { supabase } = await requireUserClient();
  const { error } = await supabase.from("user_goals").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/stats");
  return { ok: true };
}
