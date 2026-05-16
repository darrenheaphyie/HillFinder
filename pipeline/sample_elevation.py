"""Sample elevation every 10 m along each way.

Reads:
  - pipeline/data/kilkenny_ways.gpkg
  - pipeline/data/kilkenny_dem.tif

Writes:
  - pipeline/data/kilkenny_profiles.parquet
    Columns: way_id, distance_m, elevation_m, lat, lon

Sampling spec:
  - 10 m intervals along each way's LineString, projected to a local
    metric CRS (EPSG:2157, Irish Transverse Mercator) for accurate
    along-line distances, then sampled in the DEM's CRS (EPSG:4326).
  - Ways shorter than 10 m get just their endpoints sampled.
  - NoData in the DEM is forward-filled from neighbours; ways with >50%
    NoData are dropped.

Idempotency: the output Parquet is written atomically (via a .tmp file).
"""
from __future__ import annotations

import sys
from pathlib import Path

DATA = Path(__file__).parent / "data"
IN_WAYS = DATA / "kilkenny_ways.gpkg"
IN_DEM = DATA / "kilkenny_dem.tif"
OUT = DATA / "kilkenny_profiles.parquet"

# CRS for accurate metric measurements over Ireland.
METRIC_CRS = "EPSG:2157"  # Irish Transverse Mercator (ITM)

SAMPLE_INTERVAL_M = 10.0
NODATA_DROP_FRAC = 0.5
# A way must be at least this long (in metres) to be sampled. Ways shorter
# than this cannot host a climb >= the detector's min length, so sampling
# them just bloats the parquet output.
MIN_WAY_LENGTH_M = 100.0


def main() -> int:
    if not IN_WAYS.exists():
        print(f"missing {IN_WAYS} — run extract_ways.py first", file=sys.stderr)
        return 1
    if not IN_DEM.exists():
        print(f"missing {IN_DEM} — run download_dem.py first", file=sys.stderr)
        return 1
    if OUT.exists():
        print(f"already exists: {OUT}")
        return 0

    import geopandas as gpd
    import numpy as np
    import pandas as pd
    import rasterio
    from shapely.geometry import LineString
    from tqdm import tqdm

    print(f"reading {IN_WAYS}")
    ways = gpd.read_file(IN_WAYS).to_crs(METRIC_CRS)
    before = len(ways)
    ways = ways[ways.geometry.length >= MIN_WAY_LENGTH_M].copy()
    print(f"  {before} ways -> {len(ways)} after dropping length < {MIN_WAY_LENGTH_M:g} m")

    print(f"opening {IN_DEM}")
    dem = rasterio.open(IN_DEM)
    dem_crs = dem.crs.to_string() if dem.crs else "EPSG:4326"

    rows: list[dict] = []
    for _, row in tqdm(ways.iterrows(), total=len(ways), desc="sampling"):
        geom = row.geometry
        if geom is None or geom.is_empty:
            continue
        # Handle MultiLineString by processing each part separately and
        # concatenating with continuous distance.
        parts: list[LineString] = (
            list(geom.geoms) if geom.geom_type == "MultiLineString" else [geom]
        )
        offset = 0.0
        for part in parts:
            length = part.length
            n = max(2, int(length // SAMPLE_INTERVAL_M) + 1)
            distances = np.linspace(0, length, n)
            pts = [part.interpolate(d) for d in distances]
            # Reproject point coords to DEM CRS for sampling.
            sample_gdf = gpd.GeoDataFrame(geometry=pts, crs=METRIC_CRS).to_crs(dem_crs)
            coords = [(p.x, p.y) for p in sample_gdf.geometry]
            elevs = np.array([v[0] for v in dem.sample(coords)], dtype=float)
            # NoData handling.
            nd = dem.nodata
            if nd is not None:
                mask = elevs == nd
                if mask.mean() > NODATA_DROP_FRAC:
                    continue
                # Forward-fill NoData, then back-fill any leading NoData.
                if mask.any():
                    last = np.nan
                    for i, m in enumerate(mask):
                        if not m:
                            last = elevs[i]
                        else:
                            elevs[i] = last
                    # Back-fill leading NaNs.
                    first = next((v for v in elevs if not np.isnan(v)), None)
                    if first is not None:
                        elevs = np.where(np.isnan(elevs), first, elevs)
            way_id = int(row.get("id", -1)) if row.get("id", None) is not None else -1
            for d, ele, p in zip(distances, elevs, sample_gdf.geometry, strict=True):
                rows.append({
                    "way_id": way_id,
                    "distance_m": float(offset + d),
                    "elevation_m": float(ele),
                    "lat": float(p.y),
                    "lon": float(p.x),
                })
            offset += length

    dem.close()
    if not rows:
        print("no samples produced", file=sys.stderr)
        return 2

    df = pd.DataFrame(rows)
    tmp = OUT.with_suffix(".parquet.tmp")
    df.to_parquet(tmp, index=False)
    tmp.replace(OUT)
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB, {len(df)} samples across {df['way_id'].nunique()} ways)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
