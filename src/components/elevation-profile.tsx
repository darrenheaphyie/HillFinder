import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { Hill } from "../lib/types";
import { gradientColor } from "../lib/geo";

type ElevationProfileProps = {
  hill: Hill;
  /** Notifies the parent when the user hovers a sample (so the map can mirror). */
  onHoverDistance?: (distanceM: number | null) => void;
};

export function ElevationProfile({ hill, onHoverDistance }: ElevationProfileProps) {
  const [hovered, setHovered] = useState<{ distanceM: number; elevationM: number; gradient: number } | null>(null);

  if (!hill.elevationProfile || hill.elevationProfile.length === 0) {
    return (
      <div className="bg-bg-elev border border-line rounded-lg p-6 text-ink-3 text-sm">
        No profile data available.
      </div>
    );
  }

  const data = hill.elevationProfile.map((s) => ({
    distanceKm: s.distanceM / 1000,
    distanceM: s.distanceM,
    elevationM: s.elevationM,
    gradient: s.gradient,
    color: gradientColor(s.gradient),
  }));

  return (
    <div className="bg-bg-elev border border-line rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wide text-ink-3">Elevation profile</h3>
        <div className="text-xs font-mono text-ink-2 min-h-[16px]">
          {hovered
            ? `${(hovered.distanceM / 1000).toFixed(2)} km · ${Math.round(
                hovered.elevationM,
              )} m · ${hovered.gradient.toFixed(1)}%`
            : "Hover the profile"}
        </div>
      </div>
      <div
        className="touch-pan-y"
        onMouseLeave={() => {
          setHovered(null);
          onHoverDistance?.(null);
        }}
        onTouchEnd={() => {
          // On touch devices, lift removes the highlight after a short delay so
          // the user can read the value, then resume scrolling.
          setTimeout(() => {
            setHovered(null);
            onHoverDistance?.(null);
          }, 1500);
        }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
            <XAxis
              dataKey="distanceKm"
              type="number"
              domain={[0, "dataMax"]}
              tickFormatter={(v: number) => `${v.toFixed(1)}`}
              stroke="#6E7889"
              fontSize={11}
              tickLine={false}
              label={{
                value: "km",
                position: "insideBottomRight",
                offset: -2,
                fontSize: 11,
                fill: "#6E7889",
              }}
            />
            <YAxis
              dataKey="elevationM"
              stroke="#6E7889"
              fontSize={11}
              tickLine={false}
              width={40}
              label={{
                value: "m",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fontSize: 11,
                fill: "#6E7889",
              }}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              cursor={{ fill: "#0B121C", fillOpacity: 0.06 }}
              content={(props: TooltipProps<number, string>) => {
                const payload = props.payload?.[0]?.payload as
                  | { distanceM: number; elevationM: number; gradient: number }
                  | undefined;
                if (!payload) return null;
                // Side effect inside render — but Recharts re-runs this on every move; we just relay.
                if (
                  !hovered ||
                  hovered.distanceM !== payload.distanceM ||
                  hovered.elevationM !== payload.elevationM
                ) {
                  setHovered(payload);
                  onHoverDistance?.(payload.distanceM);
                }
                return (
                  <div className="bg-bg-elev border border-line rounded-md px-2 py-1.5 text-xs shadow-sm">
                    <div className="font-mono">{(payload.distanceM / 1000).toFixed(2)} km</div>
                    <div className="text-ink-2">{Math.round(payload.elevationM)} m</div>
                    <div className="font-mono" style={{ color: gradientColor(payload.gradient) }}>
                      {payload.gradient.toFixed(1)}%
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="elevationM" isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <GradientLegend />
    </div>
  );
}

function GradientLegend() {
  const bands: { label: string; color: string }[] = [
    { label: "<3%", color: "#4A9D5F" },
    { label: "3–6%", color: "#A8C242" },
    { label: "6–9%", color: "#E8B53C" },
    { label: "9–12%", color: "#E8843B" },
    { label: "≥12%", color: "#C73E3E" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-mono text-ink-3">
      {bands.map((b) => (
        <li key={b.label} className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm" style={{ background: b.color }} />
          {b.label}
        </li>
      ))}
    </ul>
  );
}
