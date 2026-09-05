import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/lib/stats";

/** A yearly completion target. `type` null means "all media". */
export interface Goal {
  id: string;
  year: number;
  type: string | null;
  target: number;
}

/**
 * `available: false` means the `user_goals` table isn't there yet (the
 * migration hasn't been run) — distinct from "no goals set". The page shows a
 * one-line setup notice for the former and the add-goal form for the latter.
 */
export type GoalsResult =
  { available: true; goals: Goal[] } | { available: false; goals: [] };

export const GOALS_MIGRATION = "supabase/migrations/0002-user-goals.sql";

/**
 * True when a PostgREST error says the goals table doesn't exist. Postgres
 * reports `42P01` (undefined_table); PostgREST's schema cache reports
 * `PGRST205` with a "Could not find the table" message instead.
 */
export function isMissingTableError(err: {
  code?: string | null;
  message?: string | null;
}): boolean {
  if (err.code === "42P01" || err.code === "PGRST205") return true;
  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes('relation "public.user_goals" does not exist') ||
    msg.includes('relation "user_goals" does not exist') ||
    msg.includes("could not find the table")
  );
}

/** Completions counted toward a goal, from the current year's stats. */
export function goalProgress(goal: Pick<Goal, "type">, stats: Stats): number {
  return goal.type === null
    ? stats.completedThisYear.total
    : (stats.completedThisYear.byType[goal.type] ?? 0);
}

type RawGoalRow = {
  id: string;
  year: number;
  type: string | null;
  target: number;
};

/** The signed-in user's goals for one year (RLS scopes them). */
export async function getGoals(year: number): Promise<GoalsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_goals")
    .select("id, year, type, target")
    .eq("year", year)
    .order("type", { ascending: true, nullsFirst: true });

  if (error) {
    if (isMissingTableError(error)) return { available: false, goals: [] };
    throw new Error(error.message);
  }

  const rows = (data as RawGoalRow[] | null) ?? [];
  return {
    available: true,
    goals: rows.map((r) => ({
      id: r.id,
      year: Number(r.year),
      type: r.type,
      target: Number(r.target),
    })),
  };
}
