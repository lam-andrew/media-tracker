import { ArrowUpRight } from "lucide-react";
import { mediaConfig, type Media, type LibraryItem, mediaKey } from "../types";
import { Cover } from "./Cover";
export function Gallery({
  items,
  open,
  owned,
}: {
  items: Media[];
  open: (m: Media) => void;
  owned: LibraryItem[];
}) {
  return (
    <section className="gallery">
      {items.map((m) => (
        <button
          className="gallery-card"
          key={mediaKey(m)}
          onClick={() => open(m)}
        >
          <div className="gallery-cover">
            <Cover item={m} />
            <span className="gallery-open">
              <ArrowUpRight size={22} />
            </span>
          </div>
          <div className="gallery-meta">
            <span>{mediaConfig[m.type]?.label ?? m.type}</span>
            <span>
              {owned.some((o) => mediaKey(o) === mediaKey(m))
                ? "Collected"
                : "Discover"}
            </span>
          </div>
          <h3>{m.title}</h3>
          <p>{m.creators.join(", ")}</p>
        </button>
      ))}
    </section>
  );
}
