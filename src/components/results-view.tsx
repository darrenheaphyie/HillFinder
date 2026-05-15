import { useEffect, useMemo, useState } from "react";
import { getHills } from "../lib/hills";
import { getTown, DEFAULT_TOWN_ID } from "../lib/towns";
import { useHashParam } from "../lib/hash-route";
import { useFilters } from "../lib/use-filters";
import { activeFilterCount, applyFilters } from "../lib/filters";
import type { Hill } from "../lib/types";
import { HillCard } from "./hill-card";
import { HillMap } from "./hill-map";
import { TownSelector } from "./town-selector";
import { FilterRail } from "./filter-rail";

type ResultsViewProps = {
  onSelectHill: (id: string) => void;
};

export function ResultsView({ onSelectHill }: ResultsViewProps) {
  const [allHills, setAllHills] = useState<Hill[]>([]);
  const [townParam, setTownParam] = useHashParam("town");
  const townId = townParam ?? DEFAULT_TOWN_ID;
  const town = getTown(townId);
  const { filters, setFilters, resetFilters } = useFilters();

  useEffect(() => {
    let cancelled = false;
    getHills().then((h) => {
      if (!cancelled) setAllHills(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const referencePoint = { lat: town.lat, lon: town.lon };
  const visibleHills = useMemo(
    () => applyFilters(allHills, filters, referencePoint),
    [allHills, filters, referencePoint.lat, referencePoint.lon],
  );
  const activeCount = activeFilterCount(filters);

  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-[420px_1fr]">
      <aside className="border-r border-line bg-bg flex flex-col min-h-0">
        <header className="px-4 py-3 border-b border-line">
          <h2 className="font-serif text-2xl text-ink leading-none">Hills near {town.name}</h2>
          <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
            <p className="text-xs text-ink-3">
              {visibleHills.length} of {allHills.length}{" "}
              {allHills.length === 1 ? "climb" : "climbs"}
            </p>
            <TownSelector
              value={townId}
              onChange={(id) => setTownParam(id === DEFAULT_TOWN_ID ? null : id)}
            />
          </div>
        </header>
        <FilterRail
          filters={filters}
          onChange={setFilters}
          onReset={resetFilters}
          activeCount={activeCount}
        />
        <div className="flex-1 overflow-auto">
          {visibleHills.length === 0 ? (
            <EmptyState
              hasActiveFilters={activeCount > 0}
              townName={town.name}
              onResetFilters={resetFilters}
            />
          ) : (
            <ul className="p-3 space-y-2">
              {visibleHills.map((h) => (
                <li key={h.id}>
                  <HillCard
                    hill={h}
                    referencePoint={referencePoint}
                    onSelect={onSelectHill}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      <section className="min-h-0">
        <HillMap
          hills={visibleHills}
          fallbackCenter={referencePoint}
          onPinClick={onSelectHill}
          enableHoverSync
        />
      </section>
    </div>
  );
}

function EmptyState({
  hasActiveFilters,
  townName,
  onResetFilters,
}: {
  hasActiveFilters: boolean;
  townName: string;
  onResetFilters: () => void;
}) {
  return (
    <div className="p-6 flex flex-col items-start gap-3">
      <h3 className="font-serif text-xl text-ink">No climbs match</h3>
      {hasActiveFilters ? (
        <>
          <p className="text-sm text-ink-2">
            Your filters are stricter than the available data. Try widening the
            length, gradient, or distance range, or pick a different reference town.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="text-sm bg-accent text-bg-elev px-3 py-1.5 rounded-md hover:bg-accent-2"
          >
            Reset filters
          </button>
        </>
      ) : (
        <p className="text-sm text-ink-2">
          No climbs are loaded near {townName}. (This shouldn't happen with the
          built-in dataset — check that <code className="font-mono">hills.json</code> loaded.)
        </p>
      )}
    </div>
  );
}
