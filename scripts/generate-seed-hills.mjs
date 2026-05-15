// Seed generator for src/data/hills.json. Produces 15 climbs across County
// Kilkenny with approximate real coordinates and synthesized elevation
// profiles. The maintainer will ground-truth these against local knowledge.
//
// Mix targeted:
//   - ~10 paved, ~5 unpaved/mixed
//   - lengths from ~200 m to ~4 km
//   - average gradients from ~3% to ~12%
//   - 5–8 hills with Strava segments, 7–10 with none
//   - 2–3 unnamed climbs (name === null)
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

function buildPolyline(start, end, n = 14) {
  const pts = [];
  const dLat = end.lat - start.lat;
  const dLon = end.lon - start.lon;
  const perpLat = -dLon;
  const perpLon = dLat;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const wiggle = Math.sin(t * Math.PI) * 0.0006;
    pts.push({
      lat: +(start.lat + dLat * t + perpLat * wiggle).toFixed(6),
      lon: +(start.lon + dLon * t + perpLon * wiggle).toFixed(6),
    });
  }
  return pts;
}

// Shape primitives — each returns a relative-gradient curve over t ∈ [0,1].
const shapes = {
  bell: (t) => 0.5 + 1.2 * Math.sin(Math.PI * t),
  earlyKick: (t) => 0.4 + 1.4 * Math.pow(Math.sin(Math.PI * t), 1.3) + 0.6 * (1 - t),
  lateKick: (t) => 0.4 + 1.4 * Math.pow(Math.sin(Math.PI * t), 1.3) + 0.6 * t,
  steady: (t) => 0.8 + 0.4 * Math.sin(Math.PI * t),
  rolling: (t) => 0.7 + 0.7 * Math.sin(Math.PI * t) + 0.4 * Math.sin(2 * Math.PI * t),
};

const HILLS = [
  {
    id: "brandon",
    name: "Brandon Hill, North Face",
    start: { lat: 52.5340, lon: -6.9500 },
    end: { lat: 52.5180, lon: -6.9710 },
    lengthM: 3200, avgGradient: 7.4, maxGradient: 13.1,
    totalAscentM: 237, startElevationM: 78, topElevationM: 315,
    surface: "paved", direction: "SE → NW (ascending NW)",
    nearestTown: "Graiguenamanagh",
    stravaSegments: [
      { id: "12345001", name: "Brandon Hill Main Climb", lengthM: 3100, avgGradient: 7.5 },
      { id: "12345002", name: "Top half — steepest pinch", lengthM: 1400, avgGradient: 9.8 },
      { id: "12345003", name: "Graig side approach", lengthM: 900, avgGradient: 4.2 },
    ],
    shape: shapes.lateKick,
  },
  // Sub-300m sharp wall for repeats.
  {
    id: "talbots-inch-wall",
    name: "Talbot's Inch Wall",
    start: { lat: 52.6620, lon: -7.2620 },
    end: { lat: 52.6638, lon: -7.2602 },
    lengthM: 260, avgGradient: 10.6, maxGradient: 14.0,
    totalAscentM: 28, startElevationM: 64, topElevationM: 92,
    surface: "paved", direction: "SW → NE",
    nearestTown: "Kilkenny city",
    stravaSegments: [
      { id: "13130001", name: "Talbot's Inch repeat", lengthM: 250, avgGradient: 10.6 },
    ],
    shape: shapes.bell,
  },
  {
    id: "tory-hill",
    name: "Tory Hill",
    start: { lat: 52.4060, lon: -7.1370 },
    end: { lat: 52.4140, lon: -7.1530 },
    lengthM: 2400, avgGradient: 6.8, maxGradient: 11.0,
    totalAscentM: 163, startElevationM: 65, topElevationM: 228,
    surface: "paved", direction: "SE → NW",
    nearestTown: "Mullinavat",
    stravaSegments: [
      { id: "22220011", name: "Tory Hill from Mullinavat", lengthM: 2300, avgGradient: 6.9 },
      { id: "22220012", name: "Tory steep section", lengthM: 700, avgGradient: 9.4 },
    ],
    shape: shapes.bell,
  },
  {
    id: "mount-leinster-approach",
    name: "Mount Leinster, Kilkenny approach",
    start: { lat: 52.5970, lon: -6.8120 },
    end: { lat: 52.6170, lon: -6.7780 },
    lengthM: 3800, avgGradient: 5.6, maxGradient: 9.2,
    totalAscentM: 213, startElevationM: 142, topElevationM: 355,
    surface: "paved", direction: "W → E",
    nearestTown: "Borris",
    stravaSegments: [],
    shape: shapes.steady,
  },
  {
    id: "woodstock",
    name: "Mount Alto via Woodstock",
    start: { lat: 52.4870, lon: -7.0520 },
    end: { lat: 52.4730, lon: -7.0410 },
    lengthM: 2780, avgGradient: 9.2, maxGradient: 16.5,
    totalAscentM: 256, startElevationM: 28, topElevationM: 284,
    surface: "unpaved", direction: "N → S",
    nearestTown: "Inistioge",
    stravaSegments: [
      { id: "44440011", name: "Woodstock Forest Climb", lengthM: 2800, avgGradient: 9.2 },
      { id: "44440012", name: "Hairpin to summit", lengthM: 600, avgGradient: 13.4 },
    ],
    shape: shapes.lateKick,
  },
  {
    id: "inistioge-south",
    name: "Inistioge South Climb",
    start: { lat: 52.4900, lon: -7.0700 },
    end: { lat: 52.4790, lon: -7.0810 },
    lengthM: 1500, avgGradient: 8.1, maxGradient: 12.8,
    totalAscentM: 121, startElevationM: 32, topElevationM: 153,
    surface: "paved", direction: "N → S",
    nearestTown: "Inistioge",
    stravaSegments: [],
    shape: shapes.bell,
  },
  {
    id: "thomastown-backroad",
    name: "Thomastown back road",
    start: { lat: 52.5320, lon: -7.1330 },
    end: { lat: 52.5250, lon: -7.1150 },
    lengthM: 1900, avgGradient: 4.2, maxGradient: 6.8,
    totalAscentM: 80, startElevationM: 55, topElevationM: 135,
    surface: "paved", direction: "NW → SE",
    nearestTown: "Thomastown",
    stravaSegments: [
      { id: "55550011", name: "Thomastown drag", lengthM: 1900, avgGradient: 4.2 },
      { id: "55550012", name: "Top half", lengthM: 900, avgGradient: 5.4 },
    ],
    shape: shapes.steady,
  },
  {
    id: "castlecomer-plateau",
    name: "Castlecomer plateau climb",
    start: { lat: 52.7920, lon: -7.2080 },
    end: { lat: 52.8060, lon: -7.2240 },
    lengthM: 2200, avgGradient: 5.2, maxGradient: 8.0,
    totalAscentM: 114, startElevationM: 152, topElevationM: 266,
    surface: "paved", direction: "S → N",
    nearestTown: "Castlecomer",
    stravaSegments: [],
    shape: shapes.rolling,
  },
  {
    id: "deadmans-lane",
    name: "Deadmans Lane",
    start: { lat: 52.7820, lon: -7.2180 },
    end: { lat: 52.7910, lon: -7.2220 },
    lengthM: 980, avgGradient: 8.9, maxGradient: 14.2,
    totalAscentM: 87, startElevationM: 168, topElevationM: 255,
    surface: "paved", direction: "S → N",
    nearestTown: "Castlecomer",
    stravaSegments: [
      { id: "77770011", name: "Deadmans Lane, full", lengthM: 980, avgGradient: 8.9 },
      { id: "77770012", name: "The Wall", lengthM: 220, avgGradient: 13.8 },
    ],
    shape: shapes.lateKick,
  },
  {
    id: "bennettsbridge-south",
    name: "Bennettsbridge South",
    start: { lat: 52.5820, lon: -7.1840 },
    end: { lat: 52.5760, lon: -7.1810 },
    lengthM: 720, avgGradient: 5.4, maxGradient: 8.1,
    totalAscentM: 39, startElevationM: 52, topElevationM: 91,
    surface: "paved", direction: "N → S",
    nearestTown: "Bennettsbridge",
    stravaSegments: [],
    shape: shapes.bell,
  },
  {
    id: "slieveardagh-spine",
    name: "Slieveardagh Spine",
    start: { lat: 52.6970, lon: -7.4910 },
    end: { lat: 52.7100, lon: -7.5080 },
    lengthM: 2900, avgGradient: 6.0, maxGradient: 9.5,
    totalAscentM: 174, startElevationM: 138, topElevationM: 312,
    surface: "mixed", direction: "SE → NW",
    nearestTown: "Ballingarry",
    stravaSegments: [],
    shape: shapes.steady,
  },
  {
    id: "freshford-three-castles",
    name: "Three Castles Climb",
    start: { lat: 52.7300, lon: -7.3920 },
    end: { lat: 52.7200, lon: -7.4080 },
    lengthM: 2100, avgGradient: 4.6, maxGradient: 7.8,
    totalAscentM: 97, startElevationM: 95, topElevationM: 192,
    surface: "paved", direction: "NE → SW",
    nearestTown: "Freshford",
    stravaSegments: [],
    shape: shapes.rolling,
  },
  {
    id: "kilmacow-wall",
    name: "Kilmacow Wall",
    start: { lat: 52.3120, lon: -7.1740 },
    end: { lat: 52.3160, lon: -7.1700 },
    lengthM: 520, avgGradient: 11.8, maxGradient: 15.4,
    totalAscentM: 61, startElevationM: 38, topElevationM: 99,
    surface: "paved", direction: "S → N",
    nearestTown: "Kilmacow",
    stravaSegments: [
      { id: "10000011", name: "Kilmacow Wall", lengthM: 520, avgGradient: 11.8 },
      { id: "10000012", name: "Final 200m", lengthM: 200, avgGradient: 14.2 },
    ],
    shape: shapes.lateKick,
  },
  // Unnamed: short sharp boreen near Mullinavat.
  {
    id: "unnamed-mullinavat-boreen",
    name: null,
    start: { lat: 52.3870, lon: -7.1700 },
    end: { lat: 52.3940, lon: -7.1820 },
    lengthM: 1640, avgGradient: 10.4, maxGradient: 17.2,
    totalAscentM: 171, startElevationM: 64, topElevationM: 235,
    surface: "unpaved", direction: "E → W",
    nearestTown: "Mullinavat",
    stravaSegments: [],
    shape: shapes.lateKick,
  },
  // Unnamed: forest road climb near Graiguenamanagh.
  {
    id: "unnamed-graig-forest",
    name: null,
    start: { lat: 52.5410, lon: -6.9620 },
    end: { lat: 52.5500, lon: -6.9730 },
    lengthM: 1380, avgGradient: 7.6, maxGradient: 11.4,
    totalAscentM: 105, startElevationM: 92, topElevationM: 197,
    surface: "unpaved", direction: "S → N",
    nearestTown: "Graiguenamanagh",
    stravaSegments: [],
    shape: shapes.bell,
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

const paved = out.filter((h) => h.surface === "paved").length;
const unpaved = out.filter((h) => h.surface === "unpaved").length;
const mixed = out.filter((h) => h.surface === "mixed").length;
const named = out.filter((h) => h.name !== null).length;
const withSegments = out.filter((h) => h.stravaSegments.length > 0).length;
console.log(`Wrote ${out.length} hills.`);
console.log(`  surfaces: paved=${paved}, unpaved=${unpaved}, mixed=${mixed}`);
console.log(`  named=${named}, unnamed=${out.length - named}`);
console.log(`  with strava segments=${withSegments}, without=${out.length - withSegments}`);
