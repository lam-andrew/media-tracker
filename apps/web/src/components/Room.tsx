import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen } from "lucide-react";
import { type LibraryItem, progressPercent, mediaConfig } from "../types";
import { Cover } from "./Cover";
export function Room({
  items,
  dusk,
  open,
  onAdd,
}: {
  items: LibraryItem[];
  dusk: boolean;
  open: (m: LibraryItem) => void;
  onAdd: () => void;
}) {
  const [active, setActive] = useState(0);
  const visible = items.slice(0, 8);
  const current = visible[active % Math.max(visible.length, 1)];
  const step = (n: number) =>
    setActive((active + n + visible.length) % visible.length);
  return (
    <section className="room" aria-label="Interactive library">
      <div className="window-light" />
      <div className="wall-grain" />
      <div className="room-label">
        <span className="dot" />
        {dusk ? "EVENING, AT YOUR PACE" : "A QUIET AFTERNOON"}
        <span>YOUR PERSONAL COLLECTION</span>
      </div>
      {current ? (
        <>
          <div className="room-layout">
            <aside className="curator">
              <span className="eyebrow">ON YOUR MIND</span>
              <h2 title={current.title}>{current.title}</h2>
              <p
                className="curator-creators"
                title={current.creators.join(", ")}
              >
                {current.creators.join(", ")}
              </p>
              <div className="curator-line" />
              <p className="caption">A little further into another world.</p>
              <button className="circle-link" onClick={() => open(current)}>
                Step inside
                <ArrowUpRight size={19} />
              </button>
            </aside>
            <div className="display">
              <div
                className="books"
                role="group"
                aria-label="Browse stories"
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    step(1);
                  }
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    step(-1);
                  }
                }}
              >
                {visible.map((m, i) => (
                  <button
                    key={m.id}
                    className={`volume ${m.type} ${current.id === m.id ? "featured" : ""}`}
                    aria-label={`Open ${m.title}`}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => open(m)}
                    style={
                      {
                        "--jacket": `var(--jacket-${i % 5})`,
                        "--height": `${270 - (i % 3) * 12}px`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="spine">
                      <span className="spine-author">{m.creators[0]}</span>
                      <strong>{m.title}</strong>
                      <span className="spine-mark">m.</span>
                    </div>
                    <div className="jacket">
                      <Cover item={m} />
                      <span className="crease" />
                    </div>
                    <span className="page-edge" />
                  </button>
                ))}
              </div>
              <div className="plinth" />
              <div className="plinth-shadow" />
            </div>
            <aside className="room-note glass">
              <BookOpen size={18} />
              <span className="eyebrow">THE ART OF TAKING YOUR TIME</span>
              <p>
                Another chapter.
                <br />
                Another world.
              </p>
              <div className="note-rule" />
              <small>{items.length} stories collected</small>
            </aside>
          </div>
          <div className="now-playing glass">
            <div className="mini-cover">
              <Cover item={current} />
            </div>
            <div className="now-text">
              <small>
                {mediaConfig[current.type]?.label ?? current.type} ·{" "}
                {current.tracking.status.replaceAll("_", " ")}
              </small>
              <strong>{current.title}</strong>
            </div>
            <button
              className="progress-ring"
              aria-label="Update progress"
              style={
                {
                  "--progress": `${progressPercent(current.tracking) * 3.6}deg`,
                } as React.CSSProperties
              }
              onClick={() => open(current)}
            >
              <span>
                {current.type === "tv"
                  ? `S${current.tracking.season ?? 1}`
                  : progressPercent(current.tracking)}
                <small>
                  {current.type === "tv" ? `E${current.tracking.current}` : "%"}
                </small>
              </span>
            </button>
            <button
              className="round"
              aria-label="Previous story"
              onClick={() => step(-1)}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="round"
              aria-label="Next story"
              onClick={() => step(1)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
          <div className="room-bottom">
            <span>HOVER TO EXPLORE · CLICK TO OPEN</span>
            <span>
              {items.length > 8
                ? "YOUR LATEST EIGHT · SEE ALL IN GALLERY"
                : "YOUR TASTE. MADE TANGIBLE."}
            </span>
          </div>
        </>
      ) : (
        <div className="empty-room">
          <BookOpen size={34} />
          <h2>A room for your stories.</h2>
          <p>Your library begins with one book.</p>
          <button className="primary" onClick={onAdd}>
            Find your first story
            <ArrowUpRight size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
