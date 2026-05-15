// Validate src/data/hills.json against the Hill type contract.
// Run via `npm run validate:hills`. Exits non-zero on failure.
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SURFACES = new Set(["paved", "unpaved", "mixed"]);

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function isObj(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkLatLon(v, where) {
  if (!isObj(v)) fail(`${where}: expected object`);
  if (typeof v.lat !== "number" || v.lat < -90 || v.lat > 90) fail(`${where}.lat invalid`);
  if (typeof v.lon !== "number" || v.lon < -180 || v.lon > 180) fail(`${where}.lon invalid`);
}

function checkHill(h, where) {
  if (!isObj(h)) fail(`${where}: not an object`);
  if (typeof h.id !== "string" || !h.id) fail(`${where}.id missing`);
  if (h.name !== null && typeof h.name !== "string") fail(`${where}.name must be string or null`);
  checkLatLon(h.start, `${where}.start`);
  checkLatLon(h.end, `${where}.end`);
  if (!Array.isArray(h.polyline) || h.polyline.length < 2) fail(`${where}.polyline must have >= 2 points`);
  h.polyline.forEach((p, i) => checkLatLon(p, `${where}.polyline[${i}]`));
  if (typeof h.lengthM !== "number" || h.lengthM <= 0) fail(`${where}.lengthM must be > 0`);
  if (typeof h.totalAscentM !== "number" || h.totalAscentM < 0) fail(`${where}.totalAscentM must be >= 0`);
  if (typeof h.avgGradient !== "number") fail(`${where}.avgGradient must be a number`);
  if (typeof h.maxGradient !== "number") fail(`${where}.maxGradient must be a number`);
  if (typeof h.startElevationM !== "number") fail(`${where}.startElevationM must be a number`);
  if (typeof h.topElevationM !== "number") fail(`${where}.topElevationM must be a number`);
  if (!SURFACES.has(h.surface)) fail(`${where}.surface invalid (got ${h.surface})`);
  if (typeof h.direction !== "string") fail(`${where}.direction missing`);
  if (!Array.isArray(h.elevationProfile) || h.elevationProfile.length < 2) fail(`${where}.elevationProfile needs >= 2 samples`);
  h.elevationProfile.forEach((s, i) => {
    if (!isObj(s) || typeof s.distanceM !== "number" || typeof s.elevationM !== "number" || typeof s.gradient !== "number") {
      fail(`${where}.elevationProfile[${i}] malformed`);
    }
  });
  if (!Array.isArray(h.stravaSegments)) fail(`${where}.stravaSegments must be an array`);
  h.stravaSegments.forEach((seg, i) => {
    if (!isObj(seg) || typeof seg.id !== "string" || typeof seg.name !== "string"
        || typeof seg.lengthM !== "number" || typeof seg.avgGradient !== "number") {
      fail(`${where}.stravaSegments[${i}] malformed`);
    }
  });
  if (typeof h.nearestTown !== "string" || !h.nearestTown) fail(`${where}.nearestTown required`);
}

const path = resolve(__dirname, "../src/data/hills.json");
const data = JSON.parse(readFileSync(path, "utf-8"));
if (!Array.isArray(data)) fail("hills.json must be an array");
data.forEach((h, i) => checkHill(h, `hills[${i}]`));
console.log(`✓ ${data.length} hills validated.`);
