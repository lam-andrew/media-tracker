"use client";

import { LayoutGrid, List, GalleryVerticalEnd } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Layout } from "./result-views";

const OPTIONS: { value: Layout; label: string; Icon: LucideIcon }[] = [
  { value: "grid", label: "Grid view", Icon: LayoutGrid },
  { value: "rows", label: "Rows view", Icon: List },
  { value: "cards", label: "Cards view", Icon: GalleryVerticalEnd },
];

export function LayoutToggle({
  value,
  onChange,
}: {
  value: Layout;
  onChange: (layout: Layout) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button
          key={v}
          type="button"
          aria-label={label}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
            value === v ? "bg-accent text-surface" : "text-muted hover:text-ink"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
