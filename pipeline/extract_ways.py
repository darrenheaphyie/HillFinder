"""Clip the Ireland OSM extract to County Kilkenny and filter to runnable ways.

Reads pipeline/data/ireland.osm.pbf, clips to a Kilkenny bounding box,
filters `highway` tags to runnable values, and writes a GeoPackage to
pipeline/data/kilkenny_ways.gpkg.

Runnable highway values:
  primary, secondary, tertiary, unclassified, residential, living_street,
  service, track, path, footway, cycleway

Excluded:
  motorway, motorway_link, trunk
"""
from __future__ import annotations

import sys
from pathlib import Path

# Co. Kilkenny rough bounding box (south, west, north, east) in WGS84.
# Buffered slightly so climbs straddling the county line are included.
KILKENNY_BBOX = (52.20, -7.65, 52.95, -6.85)

RUNNABLE_HIGHWAYS = {
    "primary",
    "secondary",
    "tertiary",
    "unclassified",
    "residential",
    "living_street",
    "service",
    "track",
    "path",
    "footway",
    "cycleway",
}

IN_PBF = Path(__file__).parent / "data" / "ireland.osm.pbf"
OUT_GPKG = Path(__file__).parent / "data" / "kilkenny_ways.gpkg"


def main() -> int:
    from pyrosm import OSM

    if not IN_PBF.exists():
        print(f"missing input {IN_PBF} — run download_osm.py first", file=sys.stderr)
        return 1
    if OUT_GPKG.exists():
        print(f"already exists: {OUT_GPKG} ({OUT_GPKG.stat().st_size / 1e6:.1f} MB)")
        return 0

    south, west, north, east = KILKENNY_BBOX
    print(f"reading {IN_PBF} with bbox {KILKENNY_BBOX}")
    osm = OSM(str(IN_PBF), bounding_box=[west, south, east, north])

    print("extracting ways...")
    ways = osm.get_network(
        network_type="all",
        extra_attributes=["surface", "tracktype", "access", "name"],
    )
    if ways is None or ways.empty:
        print("no ways returned", file=sys.stderr)
        return 2

    # Filter highway tags to runnable values.
    before = len(ways)
    ways = ways[ways["highway"].isin(RUNNABLE_HIGHWAYS)].copy()
    print(f"  {before} ways -> {len(ways)} runnable")

    # Keep only useful columns.
    keep = [c for c in ("id", "highway", "name", "surface", "tracktype", "access", "geometry") if c in ways.columns]
    ways = ways[keep]

    OUT_GPKG.parent.mkdir(parents=True, exist_ok=True)
    ways.to_file(OUT_GPKG, driver="GPKG")
    print(f"wrote {OUT_GPKG} ({OUT_GPKG.stat().st_size / 1e6:.1f} MB, {len(ways)} ways)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
