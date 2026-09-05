"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/media-config";
import { setGoal, removeGoal } from "@/lib/goal-actions";
import { useToast } from "@/components/toast/toast";

export interface GoalView {
  id: string;
  year: number;
  type: string | null;
  target: number;
  /** Completions counted toward it so far (computed server-side). */
  done: number;
}

const ALL_MEDIA = "";

function labelFor(type: string | null): string {
  if (type === null) return "All media";
  return MEDIA_TYPES.find((t) => t.type === type)?.labelPlural ?? type;
}

/**
 * Yearly goals: one progress bar per goal, an inline add form, and a remove
 * button. Writes go through server actions; the page re-renders with the new
 * rows on `revalidatePath`, so local state only tracks pending UI.
 */
export function Goals({ year, goals }: { year: number; goals: GoalView[] }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);
  const [type, setType] = useState<string>(ALL_MEDIA);
  const [target, setTarget] = useState<string>("");
  const [goalYear, setGoalYear] = useState<string>(String(year));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const n = Number(target);
    const y = Number(goalYear);
    if (!Number.isInteger(n) || n < 1) {
      toast("Enter a target of at least 1.", "error");
      return;
    }
    startTransition(async () => {
      try {
        await setGoal(y, type === ALL_MEDIA ? null : type, n);
        setTarget("");
        toast("Goal saved", "success");
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Couldn't save the goal.",
          "error",
        );
      }
    });
  }

  function onRemove(id: string) {
    setRemoving(id);
    startTransition(async () => {
      try {
        await removeGoal(id);
        toast("Goal removed", "success");
      } catch (err) {
        toast(
          err instanceof Error ? err.message : "Couldn't remove the goal.",
          "error",
        );
      } finally {
        setRemoving(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {goals.length === 0 ? (
        <p className="text-sm text-muted">
          No goals for {year} yet — set a target below and watch it fill up.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.done / g.target) * 100));
            const reached = g.done >= g.target;
            const isRemoving = removing === g.id;
            return (
              <li key={g.id} className={isRemoving ? "opacity-50" : undefined}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <span>
                      {labelFor(g.type)} · {g.done} of {g.target}
                    </span>
                    {reached ? (
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-accent">
                        Reached
                      </span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-muted">{pct}%</span>
                    <button
                      type="button"
                      onClick={() => onRemove(g.id)}
                      disabled={pending}
                      aria-label={`Remove ${labelFor(g.type)} goal`}
                      title="Remove goal"
                      className="rounded p-1 text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-60"
                    >
                      {isRemoving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <X size={14} />
                      )}
                    </button>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={g.target}
                  aria-valuenow={Math.min(g.done, g.target)}
                  aria-label={`${labelFor(g.type)} goal`}
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={onSubmit}
        className="flex flex-wrap items-end gap-3 border-t border-border pt-4"
      >
        <label className="flex flex-col gap-1 text-xs text-muted">
          Year
          <input
            type="number"
            min={2000}
            max={2100}
            value={goalYear}
            onChange={(e) => setGoalYear(e.target.value)}
            required
            className="w-24 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-border-strong focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Media
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink focus:border-border-strong focus:outline-none"
          >
            <option value={ALL_MEDIA}>All media</option>
            {MEDIA_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.labelPlural}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Target
          <input
            type="number"
            min={1}
            max={10000}
            step={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. 24"
            required
            className="w-28 rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-muted/70 focus:border-border-strong focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong disabled:opacity-70"
        >
          {pending && removing === null ? (
            <Loader2 size={14} className="animate-spin" />
          ) : null}
          Add a goal
        </button>
      </form>
    </div>
  );
}
