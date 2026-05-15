import { useCallback, useEffect, useMemo, useState } from "react";
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
import { SkeletonCard } from "./skeleton-card";
import { BottomSheet } from "./bottom-sheet";

type ResultsViewProps = {
  onSelectHill: (id: string) => void;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "loaded"; hills: Hill[] }
  | { kind: "error"; message: string };

type MobileView = "list" | "map";

export function ResultsView({ onSelectHill }: ResultsViewProps) {
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [townParam, setTownParam] = useHashParam("town");
  const townId = townParam ?? DEFAULT_TOWN_ID;
  const town = getTown(townId);
  const { filters, setFilters, resetFilters } = useFilters();
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const fetchHills = useCallback(() => {
    setLoad({ kind: "loading" });
    getHills()
      .then((h) => setLoad({ kind: "loaded", hills: h }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setLoad({ kind: "error", message });
      });
  }, []);

  useEffect(() => {
    fetchHills();
  }, [fetchHills]);

  const allHills = load.kind === "loaded" ? load.hills : [];

  const referencePoint = { lat: town.lat, lon: town.lon };
  const visibleHills = useMemo(
    () => applyFilters(allHills, filters, referencePoint),
    [allHills, filters, referencePoint.lat, referencePoint.lon],
  );
  const activeCount = activeFilterCount(filters);

  const listContent = (
    <>
      {load.kind === "loading" ? (
        <ul className="p-3 space-y-2" aria-busy="true" aria-label="Loading hills">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i}>
              <SkeletonCard />
            </li>
          ))}
        </ul>
      ) : load.kind === "error" ? (
        <ErrorState message={load.message} onRetry={fetchHills} />
      ) : visibleHills.length === 0 ? (
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
    </>
  );

  const mapContent = (
    <div className="relative h-full">
      <HillMap
        hills={visibleHills}
        fallbackCenter={referencePoint}
        onPinClick={onSelectHill}
        enableHoverSync
      />
      {load.kind === "loading" && (
        <div className="absolute inset-x-0 top-0 bg-bg-elev/70 backdrop-blur-sm text-xs text-ink-2 text-center py-1 pointer-events-none">
          Loading…
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col md:grid md:grid-cols-[420px_1fr]">
      {/* Desktop sidebar (≥md) */}
      <aside className="hidden md:flex border-r border-line bg-bg flex-col min-h-0">
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
        <div className="flex-1 overflow-auto">{listContent}</div>
      </aside>
      <section className="hidden md:block min-h-0 relative">{mapContent}</section>

      {/* Mobile (<md): toggle list/map full-screen, filters in bottom sheet */}
      <div className="md:hidden flex flex-col h-full min-h-0">
        <header className="px-4 py-3 border-b border-line bg-bg-elev shrink-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl text-ink leading-none truncate">
              Hills near {town.name}
            </h2>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
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

        {/* Segmented control: list / map */}
        <div role="tablist" aria-label="View" className="flex border-b border-line bg-bg shrink-0">
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === "list"}
            onClick={() => setMobileView("list")}
            className={`flex-1 min-h-[44px] text-sm font-medium ${
              mobileView === "list" ? "text-ink border-b-2 border-accent" : "text-ink-3"
            }`}
          >
            List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileView === "map"}
            onClick={() => setMobileView("map")}
            className={`flex-1 min-h-[44px] text-sm font-medium ${
              mobileView === "map" ? "text-ink border-b-2 border-accent" : "text-ink-3"
            }`}
          >
            Map
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto pb-20">
          {mobileView === "list" ? listContent : <div className="h-full">{mapContent}</div>}
        </div>

        {/* Floating Filters button */}
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="fixed bottom-4 right-4 z-30 bg-accent text-bg-elev rounded-full shadow-lg px-4 min-h-[44px] flex items-center gap-2 hover:bg-accent-2"
          aria-label={`Open filters${activeCount > 0 ? `, ${activeCount} active` : ""}`}
        >
          <span className="text-sm font-medium">Filters</span>
          {activeCount > 0 && (
            <span className="bg-bg-elev/30 text-bg-elev font-mono text-[10px] rounded-full px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </button>

        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
        >
          <FilterRail
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            activeCount={activeCount}
          />
          <div className="p-3 sticky bottom-0 bg-bg-elev border-t border-line">
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="w-full min-h-[44px] bg-accent text-bg-elev rounded-md font-medium hover:bg-accent-2"
            >
              Show {visibleHills.length} {visibleHills.length === 1 ? "climb" : "climbs"}
            </button>
          </div>
        </BottomSheet>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-6 flex flex-col items-start gap-3">
      <h3 className="font-serif text-xl text-ink">Couldn't load hills</h3>
      <p className="text-sm text-ink-2">
        Something went wrong fetching the climbs. {message ? <em>({message})</em> : null}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] text-sm bg-accent text-bg-elev px-3 py-1.5 rounded-md hover:bg-accent-2"
      >
        Retry
      </button>
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
            className="min-h-[44px] text-sm bg-accent text-bg-elev px-3 py-1.5 rounded-md hover:bg-accent-2"
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
