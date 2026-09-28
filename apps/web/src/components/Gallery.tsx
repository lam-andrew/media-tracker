import { useState } from "react";
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
  const ownedMap = new Map(owned.map((m) => [mediaKey(m), m]));
  const [layout, setLayout] = useState(
    localStorage.getItem("marqd-layout") ?? "grid",
  );
  return (
    <>
      <div className="layout-picker" aria-label="Layout">
        {["grid", "list"].map((l) => (
          <button
            key={l}
            aria-pressed={layout === l}
            onClick={() => {
              setLayout(l);
              localStorage.setItem("marqd-layout", l);
            }}
          >
            {l === "grid" ? "Gallery" : "List"}
          </button>
        ))}
      </div>
      <section
        className={layout === "list" ? "gallery list-layout" : "gallery"}
      >
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
                {ownedMap.has(mediaKey(m))
                  ? `${mediaConfig[m.type].statuses[ownedMap.get(mediaKey(m))!.tracking.status]}${ownedMap.get(mediaKey(m))!.tracking.rating ? ` · ${ownedMap.get(mediaKey(m))!.tracking.rating} ★` : ""}${ownedMap.get(mediaKey(m))!.tracking.favorite ? " ♥" : ""}`
                  : "Discover"}
              </span>
            </div>
            <h3>{m.title}</h3>
            <p>{m.creators.join(", ")}</p>
          </button>
        ))}
      </section>
    </>
  );
}
