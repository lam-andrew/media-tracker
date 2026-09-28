import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "../api";
import { mediaConfig, type LibraryItem, type Goal } from "../types";
export function Insights({ items }: { items: LibraryItem[] }) {
  const qc = useQueryClient(),
    year = new Date().getFullYear();
  const [type, setType] = useState("all"),
    [target, setTarget] = useState(24),
    [error, setError] = useState("");
  const goals = useQuery({
    queryKey: ["goals"],
    queryFn: () => api<Goal[]>("/goals"),
  });
  const update = useMutation({
    mutationFn: (g: Goal) =>
      api("/goals", { method: "PUT", body: JSON.stringify(g) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
    onError: (e) => setError(e.message),
  });
  const complete = items.filter((m) => m.tracking.status === "completed");
  const thisYear = complete.filter((m) =>
    (m.tracking.finishedAt || m.createdAt || "").startsWith(String(year)),
  );
  const ratings = items.flatMap((m) =>
    m.tracking.rating ? [m.tracking.rating] : [],
  );
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, new Date().getMonth() - 11 + i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: d.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      }),
      count: complete.filter((m) =>
        (m.tracking.finishedAt || m.createdAt || "").startsWith(k),
      ).length,
    };
  });
  const genreCounts = new Map<string, number>();
  for (const m of items)
    for (const g of Array.isArray(m.metadata.genres) ? m.metadata.genres : [])
      if (typeof g === "string")
        genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  return (
    <section className="feature-panel">
      <h2>Your stories, in perspective.</h2>
      <div className="stat-grid">
        {[
          ["Collected", items.length],
          ["Finished this year", thisYear.length],
          [
            "Average rating",
            ratings.length
              ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
              : "—",
          ],
          ["Favorites", items.filter((m) => m.tracking.favorite).length],
        ].map(([label, value]) => (
          <article className="glass" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <h3>Your collection</h3>
      <div className="stat-grid">
        {Object.entries(mediaConfig).map(([t, c]) => (
          <article className="glass" key={t}>
            <strong>{items.filter((m) => m.type === t).length}</strong>
            <span>{c.label}</span>
            <small>
              {complete.filter((m) => m.type === t).length} completed
            </small>
          </article>
        ))}
      </div>
      <h3>By status</h3>
      <div className="stat-grid">
        {["backlog", "in_progress", "completed", "abandoned"].map((status) => (
          <article className="glass" key={status}>
            <strong>
              {items.filter((m) => m.tracking.status === status).length}
            </strong>
            <span>{status.replaceAll("_", " ")}</span>
          </article>
        ))}
      </div>
      <h3>Your ratings</h3>
      <div className="activity-bars">
        {Array.from({ length: 10 }, (_, i) => (i + 1) / 2).map((r) => {
          const count = ratings.filter((v) => v === r).length;
          return (
            <div key={r}>
              <span>{count}</span>
              <div
                style={{
                  height: Math.max(
                    4,
                    (count / Math.max(1, ratings.length)) * 160,
                  ),
                }}
              />
              <small>{r} ★</small>
            </div>
          );
        })}
      </div>
      <h3>Favorite genres</h3>
      <div className="media-facts">
        {[...genreCounts]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([genre, count]) => (
            <span key={genre}>
              {genre} · {count}
            </span>
          ))}
      </div>
      <h3>The last twelve months</h3>
      <div className="activity-bars">
        {months.map((m) => (
          <div key={m.label}>
            <span>{m.count}</span>
            <div
              style={{
                height: Math.max(
                  4,
                  (m.count / Math.max(1, ...months.map((m) => m.count))) * 110,
                ),
              }}
            />
            <small>{m.label}</small>
          </div>
        ))}
      </div>
      <h3>{year} goals</h3>
      {goals.isError && <p role="alert">Could not load goals.</p>}
      {goals.data
        ?.filter((g) => g.year === year)
        .map((g) => {
          const done = thisYear.filter(
            (m) => g.type === "all" || m.type === g.type,
          ).length;
          return (
            <article className="goal-row glass" key={g.type}>
              <strong>{mediaConfig[g.type]?.label ?? "All stories"}</strong>
              <span>
                {done} / {g.target}
              </span>
              <progress max={g.target} value={done} />
              <button
                onClick={async () => {
                  try {
                    await api("/goals", {
                      method: "DELETE",
                      body: JSON.stringify(g),
                    });
                    await qc.invalidateQueries({ queryKey: ["goals"] });
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Remove goal
              </button>
            </article>
          );
        })}
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          update.mutate({ year, type, target });
        }}
      >
        <label>
          Goal type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All media</option>
            {Object.entries(mediaConfig).map(([t, c]) => (
              <option key={t} value={t}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Yearly target
          <input
            type="number"
            min={1}
            max={100000}
            required
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </label>
        <button className="primary" disabled={update.isPending}>
          Save goal
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
