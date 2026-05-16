import type { Hill, HillFilters } from "./types";
import { haversineKm } from "./geo";
import { validateHills } from "./validate";

// Single fetch boundary — today reads JSON, later swaps to an API call.
// Do NOT add a second data path. All consumers go through getHills().

// Lazy-load the bundled JSON so it can go into its own chunk. Vite splits
// dynamic imports into separate assets, which keeps the main bundle small
// when the dataset grows.
let allHillsPromise: Promise<Hill[]> | null = null;
async function loadAllHills(): Promise<Hill[]> {
  if (!allHillsPromise) {
    allHillsPromise = import("../data/hills.json").then((mod) =>
      validateHills(mod.default),
    );
  }
  return allHillsPromise;
}

export async function getHills(filters?: HillFilters): Promise<Hill[]> {
  const all = await loadAllHills();
  if (!filters) return all;

  const filtered = all.filter((h) => {
    const d = haversineKm(filters.referencePoint, h.start);
    if (d > filters.maxDistanceKm) return false;
    if (h.lengthM < filters.lengthRangeM[0] || h.lengthM > filters.lengthRangeM[1]) return false;
    if (h.avgGradient < filters.gradientRangePct[0] || h.avgGradient > filters.gradientRangePct[1]) return false;
    if (h.totalAscentM < filters.ascentRangeM[0] || h.totalAscentM > filters.ascentRangeM[1]) return false;
    if (filters.surface !== "either" && h.surface !== filters.surface) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "closest":
      sorted.sort(
        (a, b) =>
          haversineKm(filters.referencePoint, a.start) -
          haversineKm(filters.referencePoint, b.start),
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

export async function getHillById(id: string): Promise<Hill | undefined> {
  const all = await loadAllHills();
  return all.find((h) => h.id === id);
}
