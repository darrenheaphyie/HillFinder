// One-off seed generator for src/data/hills.json. Produces 3 stub hills with
// real (approximate) Kilkenny coordinates and synthesized elevation profiles.
// Issue #4 will expand this to 15 climbs.
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildProfile({ lengthM, startElevationM, avgGradient, maxGradient, shape, samples = 36 }) {
  const raw = [];
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    raw.push(shape(t));
  }
  const mean = raw.reduce((a, b) => a + b, 0) / raw.length;
  let grades = raw.map((r) => (r / mean) * avgGradient);
  grades = grades.map((g) => Math.min(g, maxGradient));

  const profile = [];
  let elevation = startElevationM;
  for (let i = 0; i < samples; i++) {
    const distanceM = (i / samples) * lengthM;
    profile.push({
      distanceM: Math.round(distanceM * 10) / 10,
      elevationM: Math.round(elevation * 10) / 10,
      gradient: Math.round(grades[i] * 10) / 10,
    });
    const segM = lengthM / samples;
    elevation += (grades[i] / 100) * segM;
  }
  profile.push({
    distanceM: lengthM,
    elevationM: Math.round(elevation * 10) / 10,
    gradient: Math.round(grades[grades.length - 1] * 10) / 10,
  });
  return profile;
}

// Build a polyline between two lat/lon endpoints with `n` intermediate points
// drawn from a slight S-curve perturbation. Purely cosmetic for the map.
function buildPolyline(start, end, n = 12) {
  const pts = [];
  const dLat = end.lat - start.lat;
  const dLon = end.lon - start.lon;
  // perpendicular jitter axis (in lat/lon space — fine for short distances)
  const perpLat = -dLon;
  const perpLon = dLat;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wiggle = Math.sin(t * Math.PI) * 0.0008;
    pts.push({
      lat: +(start.lat + dLat * t + perpLat * wiggle).toFixed(6),
      lon: +(start.lon + dLon * t + perpLon * wiggle).toFixed(6),
    });
  }
  return pts;
}

const HILLS = [
  {
    id: "brandon",
    name: "Brandon Hill, North Face",
    start: { lat: 52.5340, lon: -6.9500 },
    end: { lat: 52.5180, lon: -6.9710 },
    lengthM: 3200,
    avgGradient: 7.4,
    maxGradient: 13.1,
    totalAscentM: 237,
    startElevationM: 78,
    topElevationM: 315,
    surface: "paved",
    direction: "SE → NW (ascending NW)",
    stravaSegments: [
      { id: "12345001", name: "Brandon Hill Main Climb", lengthM: 3100, avgGradient: 7.5 },
      { id: "12345002", name: "Top half — steepest pinch", lengthM: 1400, avgGradient: 9.8 },
      { id: "12345003", name: "Graig side approach", lengthM: 900, avgGradient: 4.2 },
    ],
    nearestTown: "Graiguenamanagh",
    shape: (t) => 0.5 + 1.2 * Math.sin(Math.PI * t) + 0.4 * t,
  },
  {
    id: "tullaroan",
    name: "Tullaroan Ridge",
    start: { lat: 52.6580, lon: -7.4250 },
    end: { lat: 52.6660, lon: -7.4050 },
    lengthM: 1450,
    avgGradient: 6.1,
    maxGradient: 9.4,
    totalAscentM: 88,
    startElevationM: 142,
    topElevationM: 230,
    surface: "paved",
    direction: "W → E",
    stravaSegments: [
      { id: "22220001", name: "Tullaroan Climb", lengthM: 1400, avgGradient: 6.1 },
      { id: "22220002", name: "Ridge top sprint", lengthM: 400, avgGradient: 8.0 },
    ],
    nearestTown: "Tullaroan",
    shape: (t) => 0.6 + Math.sin(Math.PI * t) * 1.0 + 0.3 * (1 - t),
  },
  {
    id: "deadmans",
    name: "Deadmans Lane",
    start: { lat: 52.7920, lon: -7.2080 },
    end: { lat: 52.8010, lon: -7.2120 },
    lengthM: 980,
    avgGradient: 8.9,
    maxGradient: 14.2,
    totalAscentM: 87,
    startElevationM: 168,
    topElevationM: 255,
    surface: "paved",
    direction: "S → N",
    stravaSegments: [
      { id: "33330001", name: "Deadmans Lane, full", lengthM: 980, avgGradient: 8.9 },
      { id: "33330002", name: "The Wall", lengthM: 220, avgGradient: 13.8 },
    ],
    nearestTown: "Castlecomer",
    shape: (t) => 0.4 + 1.4 * Math.pow(Math.sin(Math.PI * t), 1.3) + 0.6 * t,
  },
];

const out = HILLS.map((h) => {
  const { shape, ...rest } = h;
  return {
    ...rest,
    polyline: buildPolyline(h.start, h.end),
    elevationProfile: buildProfile({
      lengthM: h.lengthM,
      startElevationM: h.startElevationM,
      avgGradient: h.avgGradient,
      maxGradient: h.maxGradient,
      shape,
    }),
  };
});

const target = resolve(__dirname, "../src/data/hills.json");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.length} hills to ${target}`);
