import type { FilterState } from "../lib/filters";
import type { SortKey, Surface } from "../lib/types";

type FilterRailProps = {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  activeCount: number;
};

const SURFACE_OPTIONS: { value: Surface | "either"; label: string }[] = [
  { value: "either", label: "Either" },
  { value: "paved", label: "Paved" },
  { value: "unpaved", label: "Unpaved" },
  { value: "mixed", label: "Mixed" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "closest", label: "Closest" },
  { value: "steepest", label: "Steepest" },
  { value: "longest", label: "Longest" },
  { value: "mostAscent", label: "Most ascent" },
];

export function FilterRail({ filters, onChange, onReset, activeCount }: FilterRailProps) {
  return (
    <div className="bg-bg-elev border-b border-line px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-wide text-ink-3">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-accent text-bg-elev text-[10px] font-mono rounded-full px-1.5 py-0.5">
              {activeCount} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={activeCount === 0}
          className="text-xs text-accent hover:text-accent-2 disabled:text-ink-4 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <RangeRow
          label="Length"
          unit="km"
          min={0}
          max={5000}
          step={50}
          value={filters.lengthRangeM}
          format={(v) => (v / 1000).toFixed(2)}
          onChange={(v) => onChange({ ...filters, lengthRangeM: v })}
        />
        <RangeRow
          label="Gradient"
          unit="%"
          min={0}
          max={20}
          step={0.5}
          value={filters.gradientRangePct}
          format={(v) => v.toFixed(1)}
          onChange={(v) => onChange({ ...filters, gradientRangePct: v })}
        />
        <RangeRow
          label="Ascent"
          unit="m"
          min={0}
          max={400}
          step={10}
          value={filters.ascentRangeM}
          format={(v) => String(v)}
          onChange={(v) => onChange({ ...filters, ascentRangeM: v })}
        />
        <SingleRow
          label="Max distance"
          unit="km"
          min={1}
          max={100}
          step={1}
          value={filters.maxDistanceKm}
          onChange={(v) => onChange({ ...filters, maxDistanceKm: v })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
        <label className="inline-flex items-center gap-2">
          <span className="text-ink-3 uppercase tracking-wide">Surface</span>
          <select
            value={filters.surface}
            onChange={(e) =>
              onChange({ ...filters, surface: e.target.value as Surface | "either" })
            }
            className="bg-bg-elev border border-line rounded-md px-2 py-1 text-ink font-medium hover:border-line-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {SURFACE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-ink-3 uppercase tracking-wide">Sort</span>
          <select
            value={filters.sort}
            onChange={(e) =>
              onChange({ ...filters, sort: e.target.value as SortKey })
            }
            className="bg-bg-elev border border-line rounded-md px-2 py-1 text-ink font-medium hover:border-line-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function RangeRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  format,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  format: (v: number) => string;
  onChange: (v: [number, number]) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-ink-3 uppercase tracking-wide">{label}</label>
        <span className="font-mono text-ink-2">
          {format(value[0])} – {format(value[1])} {unit}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange([Math.min(next, value[1]), value[1]]);
          }}
          aria-label={`${label} minimum`}
          className="w-full accent-accent"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange([value[0], Math.max(next, value[0])]);
          }}
          aria-label={`${label} maximum`}
          className="w-full accent-accent"
        />
      </div>
    </div>
  );
}

function SingleRow({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-ink-3 uppercase tracking-wide">{label}</label>
        <span className="font-mono text-ink-2">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="w-full accent-accent mt-1"
      />
    </div>
  );
}
