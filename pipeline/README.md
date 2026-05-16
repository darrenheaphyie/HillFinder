# HillFinder pipeline

OpenStreetMap roads + open elevation data → detected climbs that match the
frontend's `Hill` type.

## What it does

```
download_osm.py        Geofabrik Ireland extract  -> pipeline/data/ireland.osm.pbf
extract_ways.py        Clip to Kilkenny, filter   -> pipeline/data/kilkenny_ways.gpkg
download_dem.py        Copernicus 30m DEM tiles   -> pipeline/data/kilkenny_dem.tif
sample_elevation.py    For each way, sample 10m   -> pipeline/data/kilkenny_profiles.parquet
detect_hills.py        Smooth, find climbs        -> pipeline/data/kilkenny_hills_raw.parquet
export_hills_json.py   Transform to Hill JSON     -> pipeline/data/kilkenny_hills.json
                       (drop into src/data/hills.json)
ground_truth_eval.py   Compare to ground_truth.csv (issue #26)
```

## Setup

Requires Python 3.11+. Geospatial deps are heavy — they bundle GDAL,
GEOS and PROJ via wheels.

```sh
cd pipeline
python -m venv .venv
source .venv/bin/activate
pip install -e .
```

On Debian/Ubuntu, if wheel installs fail, install system libraries first:

```sh
sudo apt install -y gdal-bin libgdal-dev libgeos-dev libproj-dev
```

## Running

Steps are linear; later scripts read what earlier scripts wrote. Run in order:

```sh
python download_osm.py
python extract_ways.py
python download_dem.py
python sample_elevation.py
python detect_hills.py
python export_hills_json.py
```

Each script is idempotent — running it twice does not duplicate work.

## Data

Intermediate outputs go to `pipeline/data/` which is gitignored. Only
`pipeline/data/ground_truth.csv` is committed (it's reference data, not
generated output).

## Config

Detection thresholds (minimum length, gradient, ascent) live in
`detect_hills.py`'s argparse defaults. See the docstring for the
algorithm description.
