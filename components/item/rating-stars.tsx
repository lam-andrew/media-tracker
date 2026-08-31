"use client";

import { useState } from "react";

/** Interactive half-star rating (0.5 increments). Pass `value` (0.5–5 or null). */
export function RatingStars({
  value,
  onChange,
  size = 28,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => {
          const pct = display >= i ? 100 : display >= i - 0.5 ? 50 : 0;
          return (
            <span
              key={i}
              className="relative inline-block"
              style={{ width: size, height: size }}
            >
              <span className="absolute inset-0">
                <Star size={size} className="text-border-strong" />
              </span>
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${pct}%` }}
              >
                <Star size={size} className="text-star" />
              </span>
              <button
                type="button"
                aria-label={`${i - 0.5} stars`}
                onMouseEnter={() => setHover(i - 0.5)}
                onClick={() => onChange(i - 0.5)}
                className="absolute left-0 top-0 z-10 h-full w-1/2 cursor-pointer"
              />
              <button
                type="button"
                aria-label={`${i} stars`}
                onMouseEnter={() => setHover(i)}
                onClick={() => onChange(i)}
                className="absolute right-0 top-0 z-10 h-full w-1/2 cursor-pointer"
              />
            </span>
          );
        })}
      </div>
      <span className="text-sm text-muted">
        {value ? value.toFixed(1) : "Not rated"}
      </span>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function Star({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.5l2.85 6.16 6.65.62-5 4.47 1.45 6.75L12 17.6 6.05 21l1.45-6.75-5-4.47 6.65-.62L12 2.5z" />
    </svg>
  );
}
