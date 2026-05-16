"""Download the Geofabrik Ireland extract.

Fetches https://download.geofabrik.de/europe/ireland-and-northern-ireland-latest.osm.pbf
to pipeline/data/ireland.osm.pbf. The next step (extract_ways.py) clips
this down to County Kilkenny and filters tags.

Reproducibility note: Geofabrik publishes new extracts daily. To pin a
specific date, replace `-latest` with a dated mirror URL.
"""
from __future__ import annotations

import sys
from pathlib import Path

import requests
from tqdm import tqdm

URL = "https://download.geofabrik.de/europe/ireland-and-northern-ireland-latest.osm.pbf"
OUT = Path(__file__).parent / "data" / "ireland.osm.pbf"


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        print(f"already exists: {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
        return 0

    print(f"downloading {URL} -> {OUT}")
    with requests.get(URL, stream=True, timeout=60) as resp:
        resp.raise_for_status()
        total = int(resp.headers.get("content-length", 0))
        with open(OUT, "wb") as f, tqdm(total=total, unit="B", unit_scale=True) as bar:
            for chunk in resp.iter_content(chunk_size=1 << 16):
                f.write(chunk)
                bar.update(len(chunk))

    print(f"done: {OUT.stat().st_size / 1e6:.1f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
