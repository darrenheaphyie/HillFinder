import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FILTERS,
  type FilterState,
  filtersFromParams,
  filtersToParams,
} from "./filters";

function readHash(): URLSearchParams {
  const raw = window.location.hash.replace(/^#/, "");
  const [, query] = raw.split("?");
  return new URLSearchParams(query ?? "");
}

function writeFilters(state: FilterState): void {
  const raw = window.location.hash.replace(/^#/, "");
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query ?? "");
  const filterParams = filtersToParams(state);
  for (const key of ["d", "len", "g", "asc", "surf", "sort"]) params.delete(key);
  for (const [k, v] of filterParams) params.set(k, v);

  const qs = params.toString();
  const next = `${path ?? ""}${qs ? `?${qs}` : ""}`;
  if (next === "") {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return;
  }
  const hash = `#${next}`;
  if (window.location.hash !== hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search + hash);
  }
}

export function useFilters(): {
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  resetFilters: () => void;
} {
  const [filters, setFiltersState] = useState<FilterState>(() => filtersFromParams(readHash()));

  // Respond to back/forward — re-derive filters from the hash.
  useEffect(() => {
    const onChange = () => setFiltersState(filtersFromParams(readHash()));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const setFilters = useCallback((next: FilterState) => {
    setFiltersState(next);
    writeFilters(next);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    writeFilters(DEFAULT_FILTERS);
  }, []);

  return { filters, setFilters, resetFilters };
}
