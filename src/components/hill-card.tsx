import { useEffect, useRef } from "react";
import type { Hill } from "../lib/types";
import { haversineKm, gradientColor } from "../lib/geo";
import { useHover } from "../lib/hover-context";

type HillCardProps = {
  hill: Hill;
  referencePoint: { lat: number; lon: number };
  onSelect: (id: string) => void;
};

export function HillCard({ hill, referencePoint, onSelect }: HillCardProps) {
  const { hoveredId, setHoveredId } = useHover();
  const isHovered = hoveredId === hill.id;
  const buttonRef = useRef<HTMLButtonElement>(null);

  const distanceKm = haversineKm(referencePoint, hill.start);
  const displayName = hill.name ?? `Unnamed climb near ${hill.nearestTown}`;

  // When highlighted from the map, smooth-scroll into view if needed.
  useEffect(() => {
    if (!isHovered) return;
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // The list container is the closest scrollable parent (overflow:auto).
    let parent: HTMLElement | null = el.parentElement;
    while (parent && getComputedStyle(parent).overflowY !== "auto") {
      parent = parent.parentElement;
    }
    if (!parent) return;
    const pRect = parent.getBoundingClientRect();
    if (rect.top < pRect.top || rect.bottom > pRect.bottom) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isHovered]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onSelect(hill.id)}
      onMouseEnter={() => setHoveredId(hill.id)}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => setHoveredId(hill.id)}
      onBlur={() => setHoveredId(null)}
      className={`w-full text-left bg-bg-elev border rounded-lg p-4 transition-colors ${
        isHovered
          ? "border-accent ring-2 ring-accent/30 shadow-sm"
          : "border-line hover:border-line-2"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-ink truncate" title={displayName}>
          {displayName}
        </h3>
        <span className="font-mono text-xs text-ink-3 shrink-0">
          {distanceKm.toFixed(1)} km
        </span>
      </div>
      <p className="text-xs text-ink-3 mt-0.5">{hill.nearestTown}</p>
      <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
        <Stat label="Length" value={`${(hill.lengthM / 1000).toFixed(2)} km`} />
        <Stat
          label="Avg"
          value={`${hill.avgGradient.toFixed(1)}%`}
          color={gradientColor(hill.avgGradient)}
        />
        <Stat label="Ascent" value={`${hill.totalAscentM} m`} />
        <Stat label="Surface" value={hill.surface} />
      </div>
    </button>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-ink-3 uppercase tracking-wide text-[10px]">{label}</div>
      <div className="font-mono text-ink" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
