import { Cover } from "@/components/media/cover";
import { COVERS } from "./sample";

/**
 * The hero visual: a tilted mosaic of real covers across every medium, fading
 * out at the edges. Purely decorative (aria-hidden); the copy carries meaning.
 */
export function CoverWall() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative h-[420px] overflow-hidden sm:h-[520px] lg:h-[560px] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_78%)]"
    >
      <div className="absolute left-1/2 top-1/2 w-[140%] -translate-x-1/2 -translate-y-1/2 -rotate-6 sm:w-[120%]">
        <ul className="grid grid-cols-6 gap-3">
          {COVERS.map((c, i) => (
            <li
              key={c.image}
              className={`relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-surface-2 shadow-sm ${
                i % 6 === 1 || i % 6 === 4 ? "translate-y-6" : ""
              }`}
            >
              <Cover src={c.image} title={c.title} sizes="140px" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
