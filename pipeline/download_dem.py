"""Download Copernicus 30m DEM tiles covering Co. Kilkenny and merge them.

Why Copernicus 30m and not Tailte Éireann LIDAR (1m)?
  - Copernicus is global, public, openly licensed (CC-BY 4.0), reachable
    via a flat S3 bucket. No auth, no clickwrap.
  - 30m horizontal resolution is sufficient for hills >= 500m long. The
    detector in detect_hills.py samples at 10m intervals along the way
    and smooths over ~50m; sub-tile DEM resolution doesn't survive that.
  - Tailte LIDAR (1m) is better but more setup. If we need to detect
    very short, very steep pinches we'd switch.

Output:
  - pipeline/data/kilkenny_dem.tif (single merged GeoTIFF, EPSG:4326)

Source:
  Copernicus DEM 30m global, S3 bucket `copernicus-dem-30m`.
  Tile naming: `Copernicus_DSM_COG_10_N{lat}_00_W{lon}_00_DEM`.
  License: https://spacedata.copernicus.eu/web/cscda/data-offer/eo-data-offer
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests
from tqdm import tqdm

S3_BASE = "https://copernicus-dem-30m.s3.amazonaws.com"

# Tiles covering Co. Kilkenny: latitude 52..53 N, longitude 6..8 W.
# Tile origins are at the southwest corner.
TILES = [
    ("N52", "W007"),
    ("N52", "W008"),
    # N52 W006 covers parts of Wexford too — useful for Mt Leinster
    # eastern approach near the Kilkenny / Wexford / Carlow tri-point.
    ("N52", "W006"),
]

DATA = Path(__file__).parent / "data"
MERGED = DATA / "kilkenny_dem.tif"


def tile_url(lat: str, lon: str) -> str:
    name = f"Copernicus_DSM_COG_10_{lat}_00_{lon}_00_DEM"
    return f"{S3_BASE}/{name}/{name}.tif"


def download_one(url: str, dest: Path) -> None:
    if dest.exists():
        return
    with requests.get(url, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        with open(dest, "wb") as f, tqdm(total=total, unit="B", unit_scale=True, desc=dest.name) as bar:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
                bar.update(len(chunk))


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    if MERGED.exists():
        print(f"already exists: {MERGED} ({MERGED.stat().st_size / 1e6:.1f} MB)")
        return 0

    tile_paths: list[Path] = []
    for lat, lon in TILES:
        url = tile_url(lat, lon)
        dest = DATA / f"copernicus_{lat}_{lon}.tif"
        try:
            download_one(url, dest)
            tile_paths.append(dest)
        except requests.HTTPError as e:
            # Some tiles in this lat/lon may not exist (sea-only). Skip.
            print(f"skipping {url}: {e}", file=sys.stderr)

    if not tile_paths:
        print("no tiles downloaded", file=sys.stderr)
        return 2

    print(f"merging {len(tile_paths)} tile(s) -> {MERGED}")
    import rasterio
    from rasterio.merge import merge

    srcs = [rasterio.open(p) for p in tile_paths]
    arr, transform = merge(srcs)
    meta = srcs[0].meta.copy()
    meta.update({"height": arr.shape[1], "width": arr.shape[2], "transform": transform})
    with rasterio.open(MERGED, "w", **meta) as dst:
        dst.write(arr)
    bounds = [s.bounds for s in srcs]
    for s in srcs:
        s.close()

    # Summary: cover of the merged raster in WGS84.
    min_lon = min(b.left for b in bounds)
    max_lon = max(b.right for b in bounds)
    min_lat = min(b.bottom for b in bounds)
    max_lat = max(b.top for b in bounds)
    print(
        f"wrote {MERGED} ({MERGED.stat().st_size / 1e6:.1f} MB), "
        f"covers lat [{min_lat:.3f}, {max_lat:.3f}], lon [{min_lon:.3f}, {max_lon:.3f}], "
        f"CRS=EPSG:4326"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
