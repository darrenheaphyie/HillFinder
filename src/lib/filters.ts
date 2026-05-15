import type { Hill, HillFilters, SortKey, Surface } from "./types";
import { haversineKm } from "./geo";

export const DEFAULT_FILTERS = {
  maxDistanceKm: 50,
  lengthRangeM: [200, 5000] as [number, number],
  gradientRangePct: [0, 20] as [number, number],
  ascentRangeM: [0, 400] as [number, number],
  surface: "either" as Surface | "either",
  sort: "closest" as SortKey,
};

export type FilterState = typeof DEFAULT_FILTERS;

export function applyFilters(
  hills: Hill[],
  state: FilterState,
  referencePoint: { lat: number; lon: number },
): Hill[] {
  const filtered = hills.filter((h) => {
    const d = haversineKm(referencePoint, h.start);
    if (d > state.maxDistanceKm) return false;
    if (h.lengthM < state.lengthRangeM[0] || h.lengthM > state.lengthRangeM[1]) return false;
    if (h.avgGradient < state.gradientRangePct[0] || h.avgGradient > state.gradientRangePct[1]) return false;
    if (h.totalAscentM < state.ascentRangeM[0] || h.totalAscentM > state.ascentRangeM[1]) return false;
    if (state.surface !== "either" && h.surface !== state.surface) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (state.sort) {
    case "closest":
      sorted.sort(
        (a, b) =>
          haversineKm(referencePoint, a.start) - haversineKm(referencePoint, b.start),
      );
      break;
    case "steepest":
      sorted.sort((a, b) => b.avgGradient - a.avgGradient);
      break;
    case "longest":
      sorted.sort((a, b) => b.lengthM - a.lengthM);
      break;
    case "mostAscent":
      sorted.sort((a, b) => b.totalAscentM - a.totalAscentM);
      break;
  }
  return sorted;
}

/**
 * Count how many filters differ from their defaults. Surface and sort each
 * count as one; each range counts as one if either bound moved.
 */
export function activeFilterCount(state: FilterState): number {
  let n = 0;
  if (state.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm) n++;
  if (
    state.lengthRangeM[0] !== DEFAULT_FILTERS.lengthRangeM[0] ||
    state.lengthRangeM[1] !== DEFAULT_FILTERS.lengthRangeM[1]
  ) n++;
  if (
    state.gradientRangePct[0] !== DEFAULT_FILTERS.gradientRangePct[0] ||
    state.gradientRangePct[1] !== DEFAULT_FILTERS.gradientRangePct[1]
  ) n++;
  if (
    state.ascentRangeM[0] !== DEFAULT_FILTERS.ascentRangeM[0] ||
    state.ascentRangeM[1] !== DEFAULT_FILTERS.ascentRangeM[1]
  ) n++;
  if (state.surface !== DEFAULT_FILTERS.surface) n++;
  if (state.sort !== DEFAULT_FILTERS.sort) n++;
  return n;
}

/**
 * Encode filters as URL hash params, omitting defaults.
 */
export function filtersToParams(state: FilterState): URLSearchParams {
  const p = new URLSearchParams();
  if (state.maxDistanceKm !== DEFAULT_FILTERS.maxDistanceKm) {
    p.set("d", String(state.maxDistanceKm));
  }
  if (
    state.lengthRangeM[0] !== DEFAULT_FILTERS.lengthRangeM[0] ||
    state.lengthRangeM[1] !== DEFAULT_FILTERS.lengthRangeM[1]
  ) {
    p.set("len", `${state.lengthRangeM[0]}-${state.lengthRangeM[1]}`);
  }
  if (
    state.gradientRangePct[0] !== DEFAULT_FILTERS.gradientRangePct[0] ||
    state.gradientRangePct[1] !== DEFAULT_FILTERS.gradientRangePct[1]
  ) {
    p.set("g", `${state.gradientRangePct[0]}-${state.gradientRangePct[1]}`);
  }
  if (
    state.ascentRangeM[0] !== DEFAULT_FILTERS.ascentRangeM[0] ||
    state.ascentRangeM[1] !== DEFAULT_FILTERS.ascentRangeM[1]
  ) {
    p.set("asc", `${state.ascentRangeM[0]}-${state.ascentRangeM[1]}`);
  }
  if (state.surface !== DEFAULT_FILTERS.surface) p.set("surf", state.surface);
  if (state.sort !== DEFAULT_FILTERS.sort) p.set("sort", state.sort);
  return p;
}

function parseRange(raw: string | null, fallback: [number, number]): [number, number] {
  if (!raw) return fallback;
  const [a, b] = raw.split("-").map((s) => Number.parseFloat(s));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return fallback;
  return [a, b];
}

const SORTS: readonly SortKey[] = ["closest", "steepest", "longest", "mostAscent"];
const SURFACES: readonly (Surface | "either")[] = ["paved", "unpaved", "mixed", "either"];

export function filtersFromParams(params: URLSearchParams): FilterState {
  const d = Number.parseFloat(params.get("d") ?? "");
  const surf = params.get("surf");
  const sort = params.get("sort");
  return {
    maxDistanceKm: Number.isFinite(d) ? d : DEFAULT_FILTERS.maxDistanceKm,
    lengthRangeM: parseRange(params.get("len"), DEFAULT_FILTERS.lengthRangeM),
    gradientRangePct: parseRange(params.get("g"), DEFAULT_FILTERS.gradientRangePct),
    ascentRangeM: parseRange(params.get("asc"), DEFAULT_FILTERS.ascentRangeM),
    surface: SURFACES.includes(surf as Surface | "either")
      ? (surf as Surface | "either")
      : DEFAULT_FILTERS.surface,
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_FILTERS.sort,
  };
}

/** Compose a FilterState into the full HillFilters shape used by the data layer. */
export function toHillFilters(
  state: FilterState,
  referencePoint: { lat: number; lon: number },
): HillFilters {
  return {
    referencePoint,
    maxDistanceKm: state.maxDistanceKm,
    lengthRangeM: state.lengthRangeM,
    gradientRangePct: state.gradientRangePct,
    ascentRangeM: state.ascentRangeM,
    surface: state.surface,
    sort: state.sort,
  };
}
