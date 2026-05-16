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
            elevation_profile.append({
                "distanceM": round(d, 1),
                "elevationM": round(e, 1),
                "gradient": round(g, 1),
            })
            prev_e, prev_d = e, d

        polyline = [{"lat": float(s["lat"]), "lon": float(s["lon"])} for _, s in slice_.iterrows()]

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
            "start": {"lat": start_lat, "lon": start_lon},
            "end": {"lat": float(row["end_lat"]), "lon": float(row["end_lon"])},
            "polyline": polyline,
            "lengthM": round(float(row["length_m"]), 1),
            "totalAscentM": round(float(row["total_ascent_m"]), 1),
            "avgGradient": round(float(row["avg_gradient_pct"]), 1),
            "maxGradient": round(float(row["max_gradient_pct"]), 1),
            "startElevationM": round(float(row["start_elevation_m"]), 1),
            "topElevationM": round(float(row["top_elevation_m"]), 1),
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
        json.dump(out, f, indent=2)
    print(f"wrote {OUT} ({len(out)} hills)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
