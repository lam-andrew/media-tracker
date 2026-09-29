import { useState } from "react";
import type { Media } from "../types";
export function Cover({ item }: { item: Media }) {
  const [failed, setFailed] = useState(false);
  return item.image && !failed ? (
    <img
      src={item.image}
      alt={`${item.title} cover`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  ) : (
    <div className="cover-fallback">
      <span>{item.title}</span>
      <small>{item.creators.join(", ")}</small>
    </div>
  );
}
