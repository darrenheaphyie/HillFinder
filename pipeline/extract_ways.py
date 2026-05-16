"""Clip the Ireland OSM extract to County Kilkenny and filter to runnable ways.

Reads pipeline/data/ireland.osm.pbf, walks every way with python-osmium,
keeps the runnable `highway=*` values that fall (partially or fully) inside
the Kilkenny bounding box, and writes a GeoPackage of LineStrings with
tag metadata to pipeline/data/kilkenny_ways.gpkg.

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
    if not IN_PBF.exists():
        print(f"missing input {IN_PBF} — run download_osm.py first", file=sys.stderr)
        return 1
    if OUT_GPKG.exists():
        print(f"already exists: {OUT_GPKG} ({OUT_GPKG.stat().st_size / 1e6:.1f} MB)")
        return 0

    import osmium
    import geopandas as gpd
    from shapely.geometry import LineString

    south, west, north, east = KILKENNY_BBOX

    class Collector(osmium.SimpleHandler):
        def __init__(self) -> None:
            super().__init__()
            self.records: list[dict] = []
            self.scanned = 0

        def way(self, w: "osmium.osm.Way") -> None:  # type: ignore[name-defined]
            self.scanned += 1
            highway = w.tags.get("highway")
            if highway not in RUNNABLE_HIGHWAYS:
                return
            # Collect coords; skip if any node is missing (handler runs in
            # locations=True mode so coords are resolved).
            coords: list[tuple[float, float]] = []
            in_bbox = False
            for n in w.nodes:
                try:
                    lon = n.lon
                    lat = n.lat
                except Exception:
                    return  # missing location
                coords.append((lon, lat))
                if west <= lon <= east and south <= lat <= north:
                    in_bbox = True
            if not in_bbox or len(coords) < 2:
                return
            self.records.append({
                "id": int(w.id),
                "highway": highway,
                "name": w.tags.get("name"),
                "surface": w.tags.get("surface"),
                "tracktype": w.tags.get("tracktype"),
                "access": w.tags.get("access"),
                "geometry": LineString(coords),
            })

    print(f"reading {IN_PBF}")
    handler = Collector()
    handler.apply_file(str(IN_PBF), locations=True)
    print(f"  scanned {handler.scanned} ways, kept {len(handler.records)} runnable inside bbox")

    if not handler.records:
        print("no ways collected", file=sys.stderr)
        return 2

    gdf = gpd.GeoDataFrame(handler.records, crs="EPSG:4326")
    OUT_GPKG.parent.mkdir(parents=True, exist_ok=True)
    gdf.to_file(OUT_GPKG, driver="GPKG")
    print(f"wrote {OUT_GPKG} ({OUT_GPKG.stat().st_size / 1e6:.1f} MB, {len(gdf)} ways)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
