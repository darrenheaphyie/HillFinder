import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Hill } from "../lib/types";
import { gradientColor } from "../lib/geo";

type ElevationProfileProps = {
  hill: Hill;
};

export function ElevationProfile({ hill }: ElevationProfileProps) {
  if (!hill.elevationProfile || hill.elevationProfile.length === 0) {
    return (
      <div className="bg-bg-elev border border-line rounded-lg p-6 text-ink-3 text-sm">
        No profile data available.
      </div>
    );
  }

  const data = hill.elevationProfile.map((s) => ({
    distanceKm: s.distanceM / 1000,
    elevationM: s.elevationM,
    gradient: s.gradient,
    fill: gradientColor(s.gradient),
  }));

  return (
    <div className="bg-bg-elev border border-line rounded-lg p-3">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3E4A5C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3E4A5C" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distanceKm"
            type="number"
            domain={[0, "dataMax"]}
            tickFormatter={(v: number) => `${v.toFixed(1)}`}
            stroke="#6E7889"
            fontSize={11}
            tickLine={false}
            label={{ value: "km", position: "insideBottomRight", offset: -2, fontSize: 11, fill: "#6E7889" }}
          />
          <YAxis
            dataKey="elevationM"
            stroke="#6E7889"
            fontSize={11}
            tickLine={false}
            width={36}
            label={{ value: "m", angle: -90, position: "insideLeft", offset: 12, fontSize: 11, fill: "#6E7889" }}
          />
          <Tooltip
            contentStyle={{ background: "#FFFFFF", border: "1px solid #E3E7EC", borderRadius: 6, fontSize: 12 }}
            formatter={(value: number, name: string) => {
              if (name === "elevationM") return [`${Math.round(value)} m`, "Elevation"];
              return [value, name];
            }}
            labelFormatter={(v: number) => `${v.toFixed(2)} km`}
          />
          <Area
            type="monotone"
            dataKey="elevationM"
            stroke="#3E4A5C"
            strokeWidth={1.5}
            fill="url(#profile-fill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
