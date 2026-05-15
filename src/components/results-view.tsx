import { useEffect, useState } from "react";
import { getHills } from "../lib/hills";
import { getTown, DEFAULT_TOWN_ID } from "../lib/towns";
import type { Hill } from "../lib/types";
import { HillCard } from "./hill-card";
import { HillMap } from "./hill-map";

type ResultsViewProps = {
  onSelectHill: (id: string) => void;
};

export function ResultsView({ onSelectHill }: ResultsViewProps) {
  const [hills, setHills] = useState<Hill[]>([]);
  const town = getTown(DEFAULT_TOWN_ID);

  useEffect(() => {
    let cancelled = false;
    getHills().then((h) => {
      if (!cancelled) setHills(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[420px_1fr]">
      <aside className="border-r border-line bg-bg flex flex-col min-h-0">
        <header className="px-4 py-3 border-b border-line">
          <h2 className="font-serif text-2xl text-ink leading-none">Hills near {town.name}</h2>
          <p className="text-xs text-ink-3 mt-1">
            {hills.length} {hills.length === 1 ? "climb" : "climbs"}
          </p>
        </header>
        <ul className="flex-1 overflow-auto p-3 space-y-2">
          {hills.map((h) => (
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
          hills={hills}
          fallbackCenter={{ lat: town.lat, lon: town.lon }}
          onPinClick={onSelectHill}
        />
      </section>
    </div>
  );
}
