"""Compare detector output against ground_truth.csv.

For each ground-truth hill, find detector outputs whose start point is
within MATCH_RADIUS_M of the ground-truth start, and categorise:
  - hit:    exactly one detector output near the start
  - miss:   no detector output near the start
  - split:  multiple detector outputs near the start
  - merge:  one detector output is near multiple ground-truth starts

Reports precision, recall, F1 — separately for the train and test rows
so we can spot overfitting.

Usage:
  python ground_truth_eval.py
  python ground_truth_eval.py --match-radius-m 250

Reads:
  pipeline/data/ground_truth.csv
  pipeline/data/kilkenny_hills_raw.parquet

Writes:
  pipeline/data/ground_truth_eval.json
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path

DATA = Path(__file__).parent / "data"
GT = DATA / "ground_truth.csv"
HILLS = DATA / "kilkenny_hills_raw.parquet"
OUT = DATA / "ground_truth_eval.json"


def haversine_m(a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = math.radians(b_lat - a_lat)
    dl = math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def load_ground_truth() -> list[dict]:
    rows: list[dict] = []
    with open(GT) as f:
        reader = csv.DictReader((line for line in f if not line.lstrip().startswith("#")))
        for r in reader:
            rows.append({
                "name": r["name"],
                "start_lat": float(r["start_lat"]),
                "start_lon": float(r["start_lon"]),
                "split": r.get("split", "train"),
            })
    return rows


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--match-radius-m", type=float, default=250.0,
                   help="A detected hill counts as 'near' a ground-truth start if within this radius.")
    args = p.parse_args(argv)

    if not GT.exists():
        print(f"missing {GT}", file=sys.stderr)
        return 1
    if not HILLS.exists():
        print(f"missing {HILLS} — run detect_hills.py first", file=sys.stderr)
        return 1

    import pandas as pd

    gt = load_ground_truth()
    hills = pd.read_parquet(HILLS)
    print(f"  {len(gt)} ground-truth rows, {len(hills)} detected climbs")

    # For each ground-truth row, find detected hills within match radius.
    matches: dict[int, list[int]] = {}  # gt_idx -> list of hill_idx
    for gi, g in enumerate(gt):
        idxs = []
        for hi, h in hills.iterrows():
            d = haversine_m(g["start_lat"], g["start_lon"], float(h["start_lat"]), float(h["start_lon"]))
            if d <= args.match_radius_m:
                idxs.append(int(hi))
        matches[gi] = idxs

    # Inverse: for each detected hill, how many ground-truth rows is it close to?
    hill_to_gt: dict[int, list[int]] = {}
    for gi, hi_list in matches.items():
        for hi in hi_list:
            hill_to_gt.setdefault(hi, []).append(gi)

    # Classify each ground-truth row.
    classification: list[dict] = []
    for gi, g in enumerate(gt):
        hi_list = matches[gi]
        if not hi_list:
            kind = "miss"
        elif len(hi_list) > 1:
            kind = "split"
        else:
            hi = hi_list[0]
            kind = "merge" if len(hill_to_gt.get(hi, [])) > 1 else "hit"
        classification.append({
            "name": g["name"],
            "split": g["split"],
            "kind": kind,
            "n_detected_near": len(hi_list),
        })

    def metrics(rows: list[dict]) -> dict:
        if not rows:
            return {"precision": 0.0, "recall": 0.0, "f1": 0.0, "n": 0,
                    "hits": 0, "misses": 0, "splits": 0, "merges": 0}
        # Treat hit + merge as recall-positive (we found at least one near the GT).
        # Splits also count as recalled (just over-detected). Misses are the only
        # recall-negative.
        misses = sum(1 for r in rows if r["kind"] == "miss")
        hits = sum(1 for r in rows if r["kind"] == "hit")
        splits = sum(1 for r in rows if r["kind"] == "split")
        merges = sum(1 for r in rows if r["kind"] == "merge")
        recalled = hits + splits + merges
        recall = recalled / len(rows)

        # Precision: how many detected hills are "vouched for" by being near
        # at least one ground-truth row? Caveat: with sparse GT, precision is
        # almost always low and reflects coverage more than wrongness.
        vouched_hills = len(hill_to_gt)
        precision = vouched_hills / max(len(hills), 1)

        f1 = 0.0 if precision + recall == 0 else 2 * precision * recall / (precision + recall)
        return {
            "n": len(rows),
            "hits": hits,
            "splits": splits,
            "merges": merges,
            "misses": misses,
            "recall": round(recall, 3),
            "precision": round(precision, 3),
            "f1": round(f1, 3),
        }

    train_rows = [r for r in classification if r["split"] == "train"]
    test_rows = [r for r in classification if r["split"] == "test"]
    train_metrics = metrics(train_rows)
    test_metrics = metrics(test_rows)

    print()
    print(f"  train ({train_metrics['n']}): hits={train_metrics['hits']} splits={train_metrics['splits']} "
          f"merges={train_metrics['merges']} misses={train_metrics['misses']} "
          f"recall={train_metrics['recall']:.2f}")
    print(f"  test  ({test_metrics['n']}): hits={test_metrics['hits']} splits={test_metrics['splits']} "
          f"merges={test_metrics['merges']} misses={test_metrics['misses']} "
          f"recall={test_metrics['recall']:.2f}")
    print(f"  detected hills total: {len(hills)}")
    print(f"  detected hills near any GT: {len(hill_to_gt)} (precision proxy)")

    out_doc = {
        "match_radius_m": args.match_radius_m,
        "n_detected": int(len(hills)),
        "n_detected_near_gt": len(hill_to_gt),
        "train": train_metrics,
        "test": test_metrics,
        "rows": classification,
    }
    with open(OUT, "w") as f:
        json.dump(out_doc, f, indent=2)
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
