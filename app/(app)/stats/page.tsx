import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Star } from "lucide-react";
import { STATUSES } from "@/lib/constants";
import { MEDIA_TYPES, type MediaTypeConfig } from "@/lib/media-config";
import { getStats } from "@/lib/stats";
import { getGoals, goalProgress, GOALS_MIGRATION } from "@/lib/goals";
import { Goals, type GoalView } from "@/components/stats/goals";
import {
  MonthlyCompletionsChart,
  RatingHistogram,
} from "@/components/stats/charts";

export const metadata: Metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-serif text-xl text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {children}
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-2xl font-semibold text-ink">
        {icon}
        {value}
      </p>
    </div>
  );
}

export default async function StatsPage() {
  const now = new Date();
  const year = now.getFullYear();
  const [stats, goalsResult] = await Promise.all([
    getStats(now),
    getGoals(year),
  ]);

  const goals: GoalView[] = goalsResult.goals.map((g) => ({
    ...g,
    done: goalProgress(g, stats),
  }));

  const goalsSection = (
    <Section title={`Goals for ${year}`}>
      <Card>
        {goalsResult.available ? (
          <Goals year={year} goals={goals} />
        ) : (
          <p className="text-sm text-muted">
            Goals need one migration: run{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs text-ink">
              {GOALS_MIGRATION}
            </code>{" "}
            in the Supabase SQL editor.
          </p>
        )}
      </Card>
    </Section>
  );

  if (stats.totalItems === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
          Stats
        </h1>
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-20 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <BarChart3 size={22} />
          </span>
          <p className="mt-4 font-serif text-lg text-ink">
            Nothing to count yet
          </p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Add a few things to your library and mark them finished — your year
            in numbers gathers here.
          </p>
          <Link
            href="/search"
            className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-accent-strong"
          >
            Find something to add
          </Link>
        </div>
        {goalsSection}
      </div>
    );
  }

  const typeColumns = MEDIA_TYPES.map((t) => t.type);
  // Types present in the data but not (yet) configured still get a row.
  const extraTypes = Object.keys(stats.totalsByType).filter(
    (t) => !typeColumns.includes(t) && stats.totalsByType[t] > 0,
  );
  const tableRows: { type: string; cfg: MediaTypeConfig | null }[] = [
    ...MEDIA_TYPES.map((t) => ({ type: t.type, cfg: t })),
    ...extraTypes.map((t) => ({ type: t, cfg: null })),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
          Stats
        </h1>
        <span className="text-sm text-muted">
          {stats.totalItems} {stats.totalItems === 1 ? "item" : "items"}
        </span>
      </div>

      <Section title="This year">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Tile
            label={`Completed in ${year}`}
            value={stats.completedThisYear.total}
          />
          <Tile
            label="Average rating"
            icon={
              stats.averageRating !== null ? (
                <Star
                  size={18}
                  className="text-star"
                  fill="currentColor"
                  aria-hidden="true"
                />
              ) : null
            }
            value={
              stats.averageRating !== null
                ? stats.averageRating.toFixed(1)
                : "—"
            }
          />
          {MEDIA_TYPES.map((t) => (
            <Tile
              key={t.type}
              label={`${t.labelPlural} ${t.statusLabels.completed.toLowerCase()}`}
              value={stats.completedThisYear.byType[t.type] ?? 0}
            />
          ))}
        </div>
      </Section>

      {goalsSection}

      <Section title="Completions by month">
        <Card>
          <MonthlyCompletionsChart months={stats.completionsByMonth} />
        </Card>
      </Section>

      <Section title="Ratings">
        <Card>
          <RatingHistogram buckets={stats.ratingHistogram} />
        </Card>
      </Section>

      <Section title="Library breakdown">
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Type</th>
                {STATUSES.map((s) => (
                  <th key={s} className="px-4 py-2.5 text-right font-medium">
                    {s.replace("_", " ")}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ type, cfg }) => {
                const counts = stats.byTypeAndStatus[type] ?? {};
                return (
                  <tr
                    key={type}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-2.5 text-ink">
                      {cfg?.labelPlural ?? type}
                    </td>
                    {STATUSES.map((s) => (
                      <td
                        key={s}
                        className="px-4 py-2.5 text-right tabular-nums text-ink"
                        title={cfg?.statusLabels[s] ?? s}
                      >
                        <span className="block text-ink">{counts[s] ?? 0}</span>
                        <span className="block text-[11px] text-muted">
                          {cfg?.statusLabels[s] ?? s}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-ink">
                      {stats.totalsByType[type] ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Top genres">
        {stats.topGenres.length === 0 ? (
          <p className="text-sm text-muted">
            No genre data yet — genres come from each item&apos;s metadata.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {stats.topGenres.map((g) => (
              <li
                key={g.genre}
                className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-muted"
              >
                {g.genre}{" "}
                <span className="tabular-nums text-ink">{g.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
