// Core domain types for HillFinder.
//
// This file is the contract between the frontend, the mock data in
// src/data/hills.json, and the future pipeline / API. Be deliberate when
// changing it — every downstream consumer derives off these shapes.
//
// Units convention:
//   - Distances and elevations are in metres unless the field name says km.
//   - Gradients are percentages (e.g. 7.4 means 7.4%), never decimals.
//   - Coordinates use WGS84 (the world's coordinate system) in decimal degrees.

/** A WGS84 coordinate. */
export type LatLon = {
  /** Latitude in decimal degrees, –90..90. */
  lat: number;
  /** Longitude in decimal degrees, –180..180. */
  lon: number;
};

/** Surface type underfoot. "mixed" means a meaningful share of the climb is each. */
export type Surface = "paved" | "unpaved" | "mixed";

export type ElevationSample = {
  /** Distance from the start of the climb, in metres. Monotonically increasing across the profile. */
  distanceM: number;
  /** Elevation above sea level at this point, in metres. */
  elevationM: number;
  /** Instantaneous gradient at this point, as a percentage (e.g. 7.4 means 7.4%). May be negative on local dips but the overall trend ascends. */
  gradient: number;
};

export type StravaSegment = {
  /** Strava segment id. Used to build outbound links: https://www.strava.com/segments/{id}. */
  id: string;
  /** Segment display name as it appears on Strava. */
  name: string;
  /** Segment length, in metres. */
  lengthM: number;
  /** Segment average gradient, as a percentage. */
  avgGradient: number;
};

export type Hill = {
  /** Stable opaque identifier. Used in URLs and as React keys. */
  id: string;
  /** Display name of the climb. `null` for unnamed climbs — render as "Unnamed climb near {nearestTown}". */
  name: string | null;
  /** Coordinates at the bottom of the climb (where you start the effort). */
  start: LatLon;
  /** Coordinates at the top of the climb. */
  end: LatLon;
  /** Ordered polyline tracing the climb on the ground, from start to end inclusive. Both endpoints are present. */
  polyline: LatLon[];
  /** Climb length along the route, in metres. */
  lengthM: number;
  /** Total ascent from start to top, in metres (topElevationM − startElevationM, accounting for any internal dips). */
  totalAscentM: number;
  /** Average gradient over the climb, as a percentage. */
  avgGradient: number;
  /** Maximum sustained gradient, as a percentage. "Sustained" means over a meaningful distance, not a single sample spike. */
  maxGradient: number;
  /** Elevation above sea level at the start of the climb, in metres. */
  startElevationM: number;
  /** Elevation above sea level at the top of the climb, in metres. */
  topElevationM: number;
  /** Surface underfoot. */
  surface: Surface;
  /** Human-readable direction of ascent (e.g. "S → N", "uphill east"). Derived from compass bearing of start→end. */
  direction: string;
  /** Sampled elevation profile from start to top. At least 2 points; typically 30+. */
  elevationProfile: ElevationSample[];
  /** Known Strava segments that overlap this climb. May be empty (no segments known). */
  stravaSegments: StravaSegment[];
  /** Nearest named town or landmark for context. Required (used in the "Unnamed climb near X" rendering for unnamed hills). */
  nearestTown: string;
};

/** Sort order for results. */
export type SortKey = "closest" | "steepest" | "longest" | "mostAscent";

/** Filters passed to `getHills`. All criteria AND together. */
export type HillFilters = {
  /** Reference point for distance calculations (a town centroid). */
  referencePoint: LatLon;
  /** Maximum distance from reference point, in kilometres. Inclusive. */
  maxDistanceKm: number;
  /** Inclusive length range, in metres. `[min, max]`. */
  lengthRangeM: [number, number];
  /** Inclusive average-gradient range, as a percentage. `[min, max]`. */
  gradientRangePct: [number, number];
  /** Inclusive total-ascent range, in metres. `[min, max]`. */
  ascentRangeM: [number, number];
  /** Filter by surface. `"either"` matches any. */
  surface: Surface | "either";
  /** Result ordering. */
  sort: SortKey;
};
