import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { type Media, type LibraryItem } from "../types";
import { Gallery } from "./Gallery";
export function Discover({
  items,
  open,
}: {
  items: LibraryItem[];
  open: (m: Media) => void;
}) {
  const result = useQuery({
    queryKey: ["discover", items.map((i) => i.id + ":" + i.version).join(",")],
    queryFn: ({ signal }) =>
      api<{ reason: string; items: Media[] }[]>("/discover", { signal }),
    staleTime: 300000,
    retry: false,
  });
  return (
    <section className="feature-panel">
      <h2>Follow your curiosity.</h2>
      <p>
        Recommendations grow from your favorites, ratings, and finished stories.
      </p>
      {result.isPending ? (
        <p role="status">Finding connections in your collection…</p>
      ) : result.isError ? (
        <div role="alert">
          Suggestions couldn’t load.{" "}
          <button onClick={() => result.refetch()}>Try again</button>
        </div>
      ) : (
        result.data?.map((row, i) => (
          <section key={i}>
            <h3>{row.reason}</h3>
            {row.items.length ? (
              <Gallery items={row.items} owned={items} open={open} />
            ) : (
              <p>
                No fresh matches yet. Add and rate more stories to shape your
                recommendations.
              </p>
            )}
          </section>
        ))
      )}
    </section>
  );
}
