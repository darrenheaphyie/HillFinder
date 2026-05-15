import rawTowns from "../data/towns.json";

export type Town = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export const TOWNS: Town[] = rawTowns as Town[];

export const DEFAULT_TOWN_ID = "kilkenny";

export function getTown(id: string): Town {
  return TOWNS.find((t) => t.id === id) ?? TOWNS.find((t) => t.id === DEFAULT_TOWN_ID)!;
}
