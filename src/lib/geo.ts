import type { LatLon } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Returns the gradient colour for a given gradient percentage. */
export function gradientColor(gradient: number): string {
  if (gradient < 3) return "#4A9D5F"; // green
  if (gradient < 6) return "#A8C242"; // lime
  if (gradient < 9) return "#E8B53C"; // yellow
  if (gradient < 12) return "#E8843B"; // orange
  return "#C73E3E"; // red
}

/** Human-readable label for a surface value. Defensive against unexpected strings. */
export function formatSurface(surface: string | null | undefined): string {
  if (!surface) return "Unknown surface";
  switch (surface) {
    case "paved": return "Paved";
    case "unpaved": return "Unpaved";
    case "mixed": return "Mixed";
    default: return "Unknown surface";
  }
}

/** Renders a hill name with a fallback for unnamed climbs. */
export function formatHillName(name: string | null, nearestTown: string): string {
  return name ?? `Unnamed climb near ${nearestTown || "unknown"}`;
}
