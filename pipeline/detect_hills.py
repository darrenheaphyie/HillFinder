"""V0 hill detector.

Algorithm (per way):
  1. Read the way's elevation profile (already sampled at ~10 m).
  2. Smooth with a centered rolling mean over a configurable window
     (default 50 m / 5 samples) to suppress LIDAR/DEM noise.
  3. Walk the smoothed profile and accumulate ascending runs. A run can
     absorb brief flats (default 50 m) or small descents (default 5 m)
     before being closed.
  4. Emit any closed run that meets the thresholds:
       length >= min_length_m
       total_ascent >= min_ascent_m
       avg_gradient >= min_avg_gradient_pct
  5. Output one row per detected hill with stats and start/end points.

Inputs:
  pipeline/data/kilkenny_profiles.parquet

Output:
  pipeline/data/kilkenny_hills_raw.parquet

This is intentionally simple. The smarter version (per-segment gradient
constraints, allow short-and-steep "wall" exceptions, merge climbs that
share a top, etc.) lives in the followup issues.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data"
IN_PROFILES = DATA / "kilkenny_profiles.parquet"
OUT = DATA / "kilkenny_hills_raw.parquet"


def bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def bearing_to_compass(deg: float) -> str:
    dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round(deg / 45) % 8
    return dirs[idx]


def detect_hills_for_profile(
    distances: list[float],
    elevations: list[float],
    lats: list[float],
    lons: list[float],
    min_length_m: float,
    min_ascent_m: float,
    min_avg_gradient_pct: float,
    smoothing_window_m: float,
    flat_tolerance_m: float,
    descent_tolerance_m: float,
    max_gradient_window_m: float = 100.0,
) -> list[dict]:
    """Detect climbs in a single way's profile."""
    import numpy as np

    if len(distances) < 5:
        return []

    elev = np.asarray(elevations, dtype=float)
    dist = np.asarray(distances, dtype=float)

    # Smooth with a centered moving average.
    sample_spacing = float(np.median(np.diff(dist))) if len(dist) > 1 else 10.0
    window = max(3, int(round(smoothing_window_m / max(sample_spacing, 1.0))))
    if window % 2 == 0:
        window += 1
    kernel = np.ones(window) / window
    # Pad with edge values so the start/end aren't dragged towards zero.
    padded = np.concatenate([np.full(window // 2, elev[0]), elev, np.full(window // 2, elev[-1])])
    smoothed = np.convolve(padded, kernel, mode="valid")
    if len(smoothed) != len(elev):
        smoothed = smoothed[: len(elev)]

    hills: list[dict] = []
    n = len(smoothed)
    i = 0
    while i < n - 1:
        # Skip non-ascending sections.
        while i < n - 1 and smoothed[i + 1] <= smoothed[i]:
            i += 1
        start = i
        peak = i
        # Climb forward while we keep gaining height, tolerating small dips.
        j = i
        descent_in_run = 0.0
        flat_in_run = 0.0
        while j < n - 1:
            d_height = smoothed[j + 1] - smoothed[j]
            d_dist = dist[j + 1] - dist[j]
            if d_height > 0:
                j += 1
                peak = j
                descent_in_run = 0.0
                flat_in_run = 0.0
            elif d_height == 0:
                flat_in_run += d_dist
                if flat_in_run > flat_tolerance_m:
                    break
                j += 1
            else:
                descent_in_run += -d_height
                if descent_in_run > descent_tolerance_m:
                    break
                j += 1
        end = peak
        if end <= start:
            i = max(i + 1, end + 1)
            continue
        length_m = dist[end] - dist[start]
        ascent_m = smoothed[end] - smoothed[start]
        if length_m <= 0:
            i = end + 1
            continue
        avg_gradient = (ascent_m / length_m) * 100.0
        if (
            length_m >= min_length_m
            and ascent_m >= min_ascent_m
            and avg_gradient >= min_avg_gradient_pct
        ):
            # Compute max gradient over a "sustained" window — wider than the
            # sample spacing so single-cell DEM artifacts don't dominate.
            window_samples = max(2, int(round(max_gradient_window_m / max(sample_spacing, 1.0))))
            max_gradient = 0.0
            for k in range(start, end - window_samples + 1):
                seg_len = dist[k + window_samples] - dist[k]
                seg_rise = smoothed[k + window_samples] - smoothed[k]
                if seg_len > 0:
                    g = (seg_rise / seg_len) * 100.0
                    if g > max_gradient:
                        max_gradient = g
            bearing = bearing_deg(lats[start], lons[start], lats[end], lons[end])
            hills.append({
                "start_lat": float(lats[start]),
                "start_lon": float(lons[start]),
                "end_lat": float(lats[end]),
                "end_lon": float(lons[end]),
                "length_m": float(length_m),
                "total_ascent_m": float(ascent_m),
                "avg_gradient_pct": float(avg_gradient),
                "max_gradient_pct": float(max_gradient),
                "start_elevation_m": float(smoothed[start]),
                "top_elevation_m": float(smoothed[end]),
                "bearing_deg": float(bearing),
                "compass": bearing_to_compass(bearing),
                "start_idx": int(start),
                "end_idx": int(end),
            })
        i = end + 1
    return hills


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="V0 hill detector")
    p.add_argument("--min-length-m", type=float, default=500.0)
    p.add_argument("--min-ascent-m", type=float, default=20.0)
    p.add_argument("--min-avg-gradient-pct", type=float, default=3.0)
    p.add_argument("--smoothing-window-m", type=float, default=50.0)
    p.add_argument("--flat-tolerance-m", type=float, default=50.0)
    p.add_argument("--descent-tolerance-m", type=float, default=5.0)
    p.add_argument("--max-gradient-window-m", type=float, default=100.0,
                   help="Window for reported max gradient. Wider = less DEM noise.")
    args = p.parse_args(argv)

    if not IN_PROFILES.exists():
        print(f"missing {IN_PROFILES} — run sample_elevation.py first", file=sys.stderr)
        return 1

    import geopandas as gpd
    import pandas as pd
    from tqdm import tqdm

    print(f"reading {IN_PROFILES}")
    profiles = pd.read_parquet(IN_PROFILES)

    # Read OSM tags for each way (we'll need surface + name for the JSON
    # export step, so join here once).
    print("loading way tags")
    ways = gpd.read_file(DATA / "kilkenny_ways.gpkg")
    way_tags = ways[[c for c in ("id", "highway", "name", "surface") if c in ways.columns]].rename(columns={"id": "way_id"})

    print(f"  params: {vars(args)}")

    rows: list[dict] = []
    for way_id, grp in tqdm(profiles.groupby("way_id"), desc="detecting"):
        grp = grp.sort_values("distance_m")
        hills = detect_hills_for_profile(
            distances=grp["distance_m"].tolist(),
            elevations=grp["elevation_m"].tolist(),
            lats=grp["lat"].tolist(),
            lons=grp["lon"].tolist(),
            min_length_m=args.min_length_m,
            min_ascent_m=args.min_ascent_m,
            min_avg_gradient_pct=args.min_avg_gradient_pct,
            smoothing_window_m=args.smoothing_window_m,
            flat_tolerance_m=args.flat_tolerance_m,
            descent_tolerance_m=args.descent_tolerance_m,
            max_gradient_window_m=args.max_gradient_window_m,
        )
        for h in hills:
            h["way_id"] = int(way_id) if way_id is not None else -1
            rows.append(h)

    if not rows:
        print("no climbs detected", file=sys.stderr)
        return 2

    df = pd.DataFrame(rows)
    df = df.merge(way_tags, on="way_id", how="left")
    tmp = OUT.with_suffix(".parquet.tmp")
    df.to_parquet(tmp, index=False)
    tmp.replace(OUT)
    print(f"wrote {OUT}: {len(df)} climbs across {df['way_id'].nunique()} ways")
    return 0


if __name__ == "__main__":
    sys.exit(main())
