import type { Surface } from "../lib/types";
import { formatSurface } from "../lib/geo";

type SurfaceBadgeProps = {
  surface: Surface;
};

/**
 * Small inline indicator: a tiny "road" graphic that's solid for paved,
 * dashed for unpaved, and striped for mixed. Pairs with the text label so
 * users can identify surface by glyph + word, not just by colour.
 */
export function SurfaceBadge({ surface }: SurfaceBadgeProps) {
  const cls =
    surface === "paved"
      ? "bg-ink-2"
      : surface === "unpaved"
        ? "bg-[image:repeating-linear-gradient(90deg,#3E4A5C,#3E4A5C_2px,transparent_2px,transparent_5px)]"
        : "bg-[image:repeating-linear-gradient(45deg,#3E4A5C,#3E4A5C_2px,#AEB6C2_2px,#AEB6C2_5px)]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`inline-block w-4 h-[3px] rounded-sm ${cls}`}
      />
      <span>{formatSurface(surface)}</span>
    </span>
  );
}
