import { useEffect, useState } from "react";
import { getHills } from "../lib/hills";
import { getTown, DEFAULT_TOWN_ID } from "../lib/towns";
import { useHashParam } from "../lib/hash-route";
import type { Hill } from "../lib/types";
import { HillCard } from "./hill-card";
import { HillMap } from "./hill-map";
import { TownSelector } from "./town-selector";
import { haversineKm } from "../lib/geo";

type ResultsViewProps = {
  onSelectHill: (id: string) => void;
};

export function ResultsView({ onSelectHill }: ResultsViewProps) {
  const [hills, setHills] = useState<Hill[]>([]);
  const [townParam, setTownParam] = useHashParam("town");
  const townId = townParam ?? DEFAULT_TOWN_ID;
  const town = getTown(townId);

  useEffect(() => {
    let cancelled = false;
    getHills().then((h) => {
      if (!cancelled) setHills(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedHills = [...hills].sort(
    (a, b) =>
      haversineKm({ lat: town.lat, lon: town.lon }, a.start) -
      haversineKm({ lat: town.lat, lon: town.lon }, b.start),
  );

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[420px_1fr]">
      <aside className="border-r border-line bg-bg flex flex-col min-h-0">
        <header className="px-4 py-3 border-b border-line">
          <h2 className="font-serif text-2xl text-ink leading-none">Hills near {town.name}</h2>
          <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
            <p className="text-xs text-ink-3">
              {sortedHills.length} {sortedHills.length === 1 ? "climb" : "climbs"}
            </p>
            <TownSelector
              value={townId}
              onChange={(id) => setTownParam(id === DEFAULT_TOWN_ID ? null : id)}
            />
          </div>
        </header>
        <ul className="flex-1 overflow-auto p-3 space-y-2">
          {sortedHills.map((h) => (
            <li key={h.id}>
              <HillCard
                hill={h}
                referencePoint={{ lat: town.lat, lon: town.lon }}
                onSelect={onSelectHill}
              />
            </li>
          ))}
        </ul>
      </aside>
      <section className="min-h-0">
        <HillMap
          hills={sortedHills}
          fallbackCenter={{ lat: town.lat, lon: town.lon }}
          onPinClick={onSelectHill}
        />
      </section>
    </div>
  );
}
