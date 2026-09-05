import type { MonthBucket } from "@/lib/stats";

/*
 * Inline-SVG charts for the Stats page: no chart library, tokens only (CSS
 * variables from app/globals.css) so they follow the light/dark theme. Bars are
 * one series each, so no legend; the surrounding heading names the data. Each
 * bar carries a <title> for hover and the whole figure has an aria-label.
 */

const W = 640;
const H = 200;
const PAD = { top: 22, right: 8, bottom: 26, left: 8 };
const MAX_BAR = 24; // thin marks: never fill the slot
const RADIUS = 4; // rounded data-end, square at the baseline

/** A column growing from the baseline with a rounded top. */
function column(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(RADIUS, w / 2, h);
  return [
    `M${x},${y + h}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + w - r}`,
    `Q${x + w},${y} ${x + w},${y + r}`,
    `V${y + h}`,
    "Z",
  ].join(" ");
}

/** Clean gridline steps for a max value. */
function ticks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 3;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? pow;
  const out: number[] = [];
  for (let v = 0; v <= max; v += step) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

interface Bar {
  key: string;
  label: string; // axis label under the bar
  count: number;
  title: string; // hover text
}

function BarChart({
  bars,
  fill,
  ariaLabel,
  labelEvery = 1,
}: {
  bars: Bar[];
  fill: string;
  ariaLabel: string;
  labelEvery?: number;
}) {
  const max = Math.max(0, ...bars.map((b) => b.count));
  const grid = ticks(max);
  const top = grid[grid.length - 1] || 1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / bars.length;
  const barW = Math.min(MAX_BAR, slot * 0.6);
  const baseline = PAD.top + plotH;
  const yFor = (v: number) => baseline - (v / top) * plotH;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={ariaLabel}
      className="h-auto w-full"
      style={{ fontFamily: "inherit" }}
    >
      {grid.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={yFor(v)}
          y2={yFor(v)}
          stroke={v === 0 ? "var(--border-strong)" : "var(--border)"}
          strokeWidth={1}
          shapeRendering="crispEdges"
        />
      ))}
      {bars.map((b, i) => {
        const cx = PAD.left + slot * i + slot / 2;
        const x = cx - barW / 2;
        const y = yFor(b.count);
        const h = baseline - y;
        return (
          <g key={b.key}>
            <title>{b.title}</title>
            {/* Hit target wider than the mark so hover is easy. */}
            <rect
              x={PAD.left + slot * i}
              y={PAD.top}
              width={slot}
              height={plotH}
              fill="transparent"
            />
            {b.count > 0 ? (
              <path d={column(x, y, barW, h)} fill={fill} />
            ) : null}
            {b.count > 0 ? (
              <text
                x={cx}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ink)"
                className="tabular-nums"
              >
                {b.count}
              </text>
            ) : null}
            {i % labelEvery === 0 ? (
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--muted)"
              >
                {b.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Last 12 months of completions. */
export function MonthlyCompletionsChart({ months }: { months: MonthBucket[] }) {
  const total = months.reduce((a, m) => a + m.count, 0);
  const summary = months.map((m) => `${m.label} ${m.count}`).join(", ");
  return (
    <BarChart
      fill="var(--accent)"
      ariaLabel={`Completions by month, last 12 months: ${plural(total, "item", "items")} in total. ${summary}.`}
      bars={months.map((m) => ({
        key: m.month,
        label: m.label,
        count: m.count,
        title: `${m.label} ${m.month.slice(0, 4)}: ${plural(m.count, "completion", "completions")}`,
      }))}
    />
  );
}

/** Half-star rating histogram, 0.5 to 5. */
export function RatingHistogram({
  buckets,
}: {
  buckets: { rating: number; count: number }[];
}) {
  const total = buckets.reduce((a, b) => a + b.count, 0);
  const summary = buckets
    .filter((b) => b.count > 0)
    .map((b) => `${b.rating} stars: ${b.count}`)
    .join(", ");
  return (
    <BarChart
      fill="var(--star)"
      ariaLabel={`Ratings histogram: ${plural(total, "rated item", "rated items")}. ${summary || "No ratings yet"}.`}
      bars={buckets.map((b) => ({
        key: String(b.rating),
        label: `${b.rating}★`,
        count: b.count,
        title: `${b.rating} stars: ${plural(b.count, "item", "items")}`,
      }))}
    />
  );
}
