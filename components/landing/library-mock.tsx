import { Star, Heart } from "lucide-react";
import { Cover } from "@/components/media/cover";
import { LIBRARY_MOCK } from "./sample";

/**
 * A miniature of the real library view (same card anatomy: poster, status
 * chip, heart, half-star rating) rendered from sample data — so what people
 * see on the landing page is what the product actually looks like.
 */
export function LibraryMock() {
  return (
    <div className="rounded-xl border border-border bg-bg p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="font-serif text-base text-ink">My Library</span>
        <span className="text-xs text-muted">24 items</span>
      </div>
      <div className="mb-3 flex gap-1.5 px-1">
        {["All", "Books", "Movies", "TV", "Games"].map((t, i) => (
          <span
            key={t}
            className={`rounded-md px-2 py-0.5 text-[11px] ${
              i === 0 ? "bg-accent text-surface" : "bg-surface-2 text-muted"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2.5">
        {LIBRARY_MOCK.map((m) => (
          <li key={m.image}>
            <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface-2">
              <Cover src={m.image} title={m.title} sizes="120px" />
              <span className="absolute left-1 top-1 rounded bg-bg/90 px-1.5 py-0.5 text-[9px] font-medium text-accent">
                {m.status}
              </span>
              <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-bg/90">
                <Heart
                  size={10}
                  className={m.rating === 5 ? "text-accent" : "text-muted"}
                  fill={m.rating === 5 ? "currentColor" : "none"}
                />
              </span>
            </div>
            <p className="mt-1 line-clamp-1 text-[11px] text-ink">{m.title}</p>
            <p className="flex items-center text-[10px] text-muted">
              <span className="line-clamp-1">{m.by}</span>
              {m.rating ? (
                <span className="ml-auto flex items-center gap-0.5 text-star">
                  <Star size={9} fill="currentColor" strokeWidth={0} />
                  {m.rating}
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
