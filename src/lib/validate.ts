import type { Hill, Surface, LatLon, ElevationSample, StravaSegment } from "./types";

// Lightweight runtime validator for src/data/hills.json. Used by the
// validate-hills script (npm run validate:hills) and importable in tests.

class ValidationError extends Error {}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new ValidationError(msg);
}

function validateLatLon(v: unknown, where: string): LatLon {
  check(isObject(v), `${where}: expected object`);
  check(typeof v.lat === "number" && v.lat >= -90 && v.lat <= 90, `${where}.lat: invalid`);
  check(typeof v.lon === "number" && v.lon >= -180 && v.lon <= 180, `${where}.lon: invalid`);
  return { lat: v.lat as number, lon: v.lon as number };
}

const SURFACES: readonly Surface[] = ["paved", "unpaved", "mixed"];

function validateElevationSample(v: unknown, where: string): ElevationSample {
  check(isObject(v), `${where}: expected object`);
  check(typeof v.distanceM === "number", `${where}.distanceM: not a number`);
  check(typeof v.elevationM === "number", `${where}.elevationM: not a number`);
  check(typeof v.gradient === "number", `${where}.gradient: not a number`);
  return v as ElevationSample;
}

function validateStravaSegment(v: unknown, where: string): StravaSegment {
  check(isObject(v), `${where}: expected object`);
  check(typeof v.id === "string", `${where}.id: not a string`);
  check(typeof v.name === "string", `${where}.name: not a string`);
  check(typeof v.lengthM === "number" && v.lengthM > 0, `${where}.lengthM: invalid`);
  check(typeof v.avgGradient === "number", `${where}.avgGradient: not a number`);
  return v as StravaSegment;
}

export function validateHill(v: unknown, where = "hill"): Hill {
  check(isObject(v), `${where}: expected object`);
  check(typeof v.id === "string" && v.id.length > 0, `${where}.id: required string`);
  check(v.name === null || typeof v.name === "string", `${where}.name: must be string or null`);
  validateLatLon(v.start, `${where}.start`);
  validateLatLon(v.end, `${where}.end`);
  check(Array.isArray(v.polyline) && v.polyline.length >= 2, `${where}.polyline: must have >= 2 points`);
  (v.polyline as unknown[]).forEach((p, i) => validateLatLon(p, `${where}.polyline[${i}]`));
  check(typeof v.lengthM === "number" && v.lengthM > 0, `${where}.lengthM: must be > 0`);
  check(typeof v.totalAscentM === "number" && v.totalAscentM >= 0, `${where}.totalAscentM: must be >= 0`);
  check(typeof v.avgGradient === "number", `${where}.avgGradient: not a number`);
  check(typeof v.maxGradient === "number", `${where}.maxGradient: not a number`);
  check(typeof v.startElevationM === "number", `${where}.startElevationM: not a number`);
  check(typeof v.topElevationM === "number", `${where}.topElevationM: not a number`);
  check(SURFACES.includes(v.surface as Surface), `${where}.surface: must be one of ${SURFACES.join(", ")}`);
  check(typeof v.direction === "string", `${where}.direction: not a string`);
  check(Array.isArray(v.elevationProfile) && v.elevationProfile.length >= 2, `${where}.elevationProfile: must have >= 2 samples`);
  (v.elevationProfile as unknown[]).forEach((s, i) => validateElevationSample(s, `${where}.elevationProfile[${i}]`));
  check(Array.isArray(v.stravaSegments), `${where}.stravaSegments: must be an array`);
  (v.stravaSegments as unknown[]).forEach((s, i) => validateStravaSegment(s, `${where}.stravaSegments[${i}]`));
  check(typeof v.nearestTown === "string" && v.nearestTown.length > 0, `${where}.nearestTown: required string`);
  return v as Hill;
}

export function validateHills(v: unknown): Hill[] {
  check(Array.isArray(v), "root: hills.json must be an array");
  return v.map((h, i) => validateHill(h, `hills[${i}]`));
}

export { ValidationError };
