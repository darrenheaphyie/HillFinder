"""Transform detector output into the frontend's Hill JSON shape.

Reads:
  - pipeline/data/kilkenny_hills_raw.parquet (per detected hill)
  - pipeline/data/kilkenny_profiles.parquet  (per-way samples)
  - pipeline/data/kilkenny_ways.gpkg         (OSM tags)

Writes:
  - pipeline/data/kilkenny_hills.json (matches the Hill TS type)

The Hill type contract is in src/lib/types.ts. This script must produce
JSON that passes scripts/validate-hills.mjs at the repo root.

stravaSegments is left as an empty array — Strava integration is a later
issue. nearestTown is computed by snapping the start coordinate to the
closest entry in src/data/towns.json.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data"
IN_RAW = DATA / "kilkenny_hills_raw.parquet"
IN_PROFILES = DATA / "kilkenny_profiles.parquet"
IN_WAYS = DATA / "kilkenny_ways.gpkg"
TOWNS = Path(__file__).parent.parent / "src" / "data" / "towns.json"
OUT = DATA / "kilkenny_hills.json"

# Max samples kept in the JSON profile/polyline. The detector samples at 10m
# along the way; a 3km climb is 300 samples raw. Downsampling to 50 keeps
# the gradient-colour fidelity in the frontend chart while bounding payload.
MAX_PROFILE_SAMPLES = 50


# Frontend uses the same colour scale; classify into 'paved' | 'unpaved' | 'mixed'.
PAVED_VALUES = {"asphalt", "paved", "concrete", "concrete:plates", "concrete:lanes", "chipseal"}
UNPAVED_VALUES = {"gravel", "dirt", "ground", "grass", "earth", "sand", "compacted", "fine_gravel", "pebblestone", "mud"}


def classify_surface(raw: object) -> str:
    if not isinstance(raw, str) or not raw.strip():
        return "paved"  # conservative default — most OSM ways in Ireland are paved unless tagged.
    norm = raw.lower().strip()
    if norm in PAVED_VALUES:
        return "paved"
    if norm in UNPAVED_VALUES:
        return "unpaved"
    return "mixed"


def haversine_km(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def main() -> int:
    if not IN_RAW.exists():
        print(f"missing {IN_RAW} — run detect_hills.py first", file=sys.stderr)
        return 1

    import geopandas as gpd
    import pandas as pd

    print(f"reading {IN_RAW}")
    hills_raw = pd.read_parquet(IN_RAW)
    print(f"  {len(hills_raw)} detected climbs")

    print(f"reading {IN_PROFILES}")
    profiles = pd.read_parquet(IN_PROFILES)

    print(f"reading {IN_WAYS}")
    ways_gdf = gpd.read_file(IN_WAYS)
    ways_geom = dict(zip(ways_gdf["id"], ways_gdf.geometry, strict=False)) if "id" in ways_gdf.columns else {}

    with open(TOWNS) as f:
        towns = json.load(f)

    out: list[dict] = []
    for i, row in hills_raw.iterrows():
        way_id = int(row["way_id"])
        start_idx = int(row["start_idx"])
        end_idx = int(row["end_idx"])

        # Extract the slice of the profile for this climb.
        way_profile = profiles[profiles["way_id"] == way_id].sort_values("distance_m").reset_index(drop=True)
        slice_ = way_profile.iloc[start_idx : end_idx + 1]
        if slice_.empty:
            continue

        # Downsample evenly while keeping the endpoints.
        if len(slice_) > MAX_PROFILE_SAMPLES:
            import numpy as np
            idxs = np.unique(np.linspace(0, len(slice_) - 1, MAX_PROFILE_SAMPLES).astype(int))
            slice_ = slice_.iloc[idxs]

        # Re-base distance to 0 at the climb start.
        d0 = slice_["distance_m"].iloc[0]
        elevation_profile = []
        prev_e = None
        prev_d = None
        for _, s in slice_.iterrows():
            d = float(s["distance_m"] - d0)
            e = float(s["elevation_m"])
            if prev_e is not None and d > prev_d:
                g = (e - prev_e) / (d - prev_d) * 100.0
            else:
                g = 0.0
            # 30m DEM doesn't justify sub-metre elevation. Distance rounded to
            # nearest 1m (sampler is 10m), gradient to 0.1%.
            elevation_profile.append({
                "distanceM": round(d),
                "elevationM": round(e),
                "gradient": round(g, 1),
            })
            prev_e, prev_d = e, d

        # 5dp lat/lon ~= 1m precision; full floats add no information and
        # triple the JSON size.
        polyline = [
            {"lat": round(float(s["lat"]), 5), "lon": round(float(s["lon"]), 5)}
            for _, s in slice_.iterrows()
        ]

        # Name: prefer OSM way name; otherwise None (frontend renders "Unnamed climb near X").
        osm_name = row.get("name", None)
        name = osm_name if isinstance(osm_name, str) and osm_name.strip() else None

        # Nearest town.
        start_lat = float(row["start_lat"])
        start_lon = float(row["start_lon"])
        nearest = min(towns, key=lambda t: haversine_km(start_lat, start_lon, t["lat"], t["lon"]))

        surface = classify_surface(row.get("surface", None))

        bearing = float(row["bearing_deg"])
        compass_from = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][round(((bearing + 180) % 360) / 45) % 8]
        compass_to = row["compass"]
        direction = f"{compass_from} → {compass_to}"

        hid = f"way{way_id}-{start_idx}"
        hill = {
            "id": hid,
            "name": name,
            "start": {"lat": round(start_lat, 5), "lon": round(start_lon, 5)},
            "end": {
                "lat": round(float(row["end_lat"]), 5),
                "lon": round(float(row["end_lon"]), 5),
            },
            "polyline": polyline,
            "lengthM": round(float(row["length_m"])),
            "totalAscentM": round(float(row["total_ascent_m"])),
            "avgGradient": round(float(row["avg_gradient_pct"]), 1),
            "maxGradient": round(float(row["max_gradient_pct"]), 1),
            "startElevationM": round(float(row["start_elevation_m"])),
            "topElevationM": round(float(row["top_elevation_m"])),
            "surface": surface,
            "direction": direction,
            "elevationProfile": elevation_profile,
            "stravaSegments": [],
            "nearestTown": nearest["name"],
        }
        # Defensive: skip pathological outputs.
        if hill["lengthM"] <= 0 or len(hill["elevationProfile"]) < 2 or len(hill["polyline"]) < 2:
            continue
        out.append(hill)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w") as f:
        # Compact: drops ~30% of file size with no info loss. Frontend never
        # reads this by hand; it's parsed by JS.
        json.dump(out, f, separators=(",", ":"))
    print(f"wrote {OUT} ({len(out)} hills, {OUT.stat().st_size / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
