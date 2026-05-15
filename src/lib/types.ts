// Core domain types for HillFinder.
//
// The Hill type here is intentionally minimal for the scaffold phase.
// It gets locked properly in issue #3.

export type LatLon = { lat: number; lon: number };

export type Surface = "paved" | "unpaved" | "mixed";

export type ElevationSample = {
  /** Distance from start of climb, in metres. */
  distanceM: number;
  /** Elevation above sea level, in metres. */
  elevationM: number;
  /** Instantaneous gradient at this point, as a percentage (e.g. 7.4). */
  gradient: number;
};

export type StravaSegment = {
  /** Strava segment id (for building outbound links). */
  id: string;
  name: string;
  /** Segment length, in metres. */
  lengthM: number;
  /** Segment average gradient, as a percentage. */
  avgGradient: number;
};

export type Hill = {
  id: string;
  /** Display name. Null for unnamed climbs ("Unnamed climb near {nearestLandmark}"). */
  name: string | null;
  /** Coordinates of the climb start (the bottom). */
  start: LatLon;
  /** Coordinates of the climb top. */
  end: LatLon;
  /** Polyline tracing the climb from start to end (inclusive). */
  polyline: LatLon[];
  /** Climb length, in metres. */
  lengthM: number;
  /** Total ascent, in metres. */
  totalAscentM: number;
  /** Average gradient over the climb, as a percentage (e.g. 5.2). */
  avgGradient: number;
  /** Maximum sustained gradient, as a percentage. */
  maxGradient: number;
  /** Elevation at the start of the climb, in metres. */
  startElevationM: number;
  /** Elevation at the top of the climb, in metres. */
  topElevationM: number;
  surface: Surface;
  /** Compass-bearing-derived human-readable direction (e.g. "S → N"). */
  direction: string;
  /** Sampled profile from start to top. */
  elevationProfile: ElevationSample[];
  /** Known Strava segments overlapping this climb. May be empty. */
  stravaSegments: StravaSegment[];
  /** Nearest named town or landmark, used for context and for unnamed climbs. */
  nearestTown: string;
};

export type SortKey = "closest" | "steepest" | "longest" | "mostAscent";

export type HillFilters = {
  /** Reference point for distance calculations (a town centroid). */
  referencePoint: LatLon;
  /** Maximum distance from reference point, in kilometres. */
  maxDistanceKm: number;
  /** Inclusive length range, in metres. */
  lengthRangeM: [number, number];
  /** Inclusive gradient range, as a percentage. */
  gradientRangePct: [number, number];
  /** Inclusive total ascent range, in metres. */
  ascentRangeM: [number, number];
  /** Filter by surface. "either" allows any. */
  surface: Surface | "either";
  sort: SortKey;
};
