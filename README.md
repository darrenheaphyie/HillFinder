# HillFinder

Find hills worth running.

HillFinder is a web app for runners and cyclists who want to find hills that match a specific training need — a 2km steady climb for sustained-effort intervals, a sharp 200m wall for repeats, a long grinder for hill endurance work. You set the parameters, the app finds the hills.

## The problem

If you train on hills, you know the drill: you want a climb of a particular length and gradient, you have a rough idea of how far you're willing to travel to get to it, and you end up squinting at contour lines on Ordnance Survey maps or scrolling through Strava segments hoping something matches. There's no good way to ask "show me every hill within 15km that's at least 1.5km long and averages 5% or more."

HillFinder is that.

## What it does

- **Search by training need.** Filter by hill length, average gradient, total ascent, surface type, and distance from your location.
- **See results on a map and as a list, side by side.** Hover one, the other highlights. Click for detail.
- **Inspect each hill properly.** Elevation profile with gradient-coloured segments (the steep bits in red, the manageable bits in green), full stats, and the climb traced on the map.
- **Cross-reference with Strava.** If there are existing Strava segments on a hill, see them. If there aren't, you might be the first to put one there.
- **Mobile-first where it matters.** Built to work on a phone at a trailhead, not just on a desktop at home.

## Status

Early-stage pet project. Currently scoped to **County Kilkenny, Ireland** for the MVP — the maintainer knows the local terrain well enough to ground-truth the algorithm against real climbs.

The current build is a **frontend prototype with hand-crafted hill data**. The next phases are:

1. ✅ UI design (done in Claude Design)
2. 🟡 Frontend mock with realistic Kilkenny hills *(in progress)*
3. ⬜ Hill detection pipeline (OSM + LIDAR elevation → detected hills)
4. ⬜ Real data for Kilkenny
5. ⬜ Strava segment integration
6. ⬜ Expand beyond Kilkenny

## How it works (the eventual plan)

A pipeline ingests OpenStreetMap road and path data for a region, samples elevation along each way from open LIDAR or DEM data, then runs a detector that finds contiguous ascending segments meeting configurable length and gradient thresholds. The results are stored in a database and served to the frontend, which renders them as a synced list + map view with Komoot-style elevation profiles.

The hard problem is the detector itself: defining what counts as "a hill" in a way that matches a runner's intuition. Too aggressive and you get a thousand tiny bumps; too loose and you miss the climbs that actually matter. The Kilkenny MVP is partly an excuse to tune that algorithm against terrain the maintainer can verify by hand.

## Tech

- React + Vite + TypeScript
- Tailwind CSS
- MapLibre GL with OpenFreeMap tiles
- Recharts for elevation profiles
- (Future) Python pipeline with `osmnx` and `rasterio` for data prep
- (Future) PostGIS for hill storage

## Data sources (planned)

- **OpenStreetMap** for road and path networks (via Geofabrik Ireland extracts)
- **Tailte Éireann LIDAR** or **Copernicus DEM** for elevation
- **Strava API** for segment cross-referencing

## Running locally

Requires Node 18+ and npm.

```sh
npm install
npm run dev       # start the Vite dev server on http://localhost:5173
npm run build     # produce a production build under dist/
npm run preview   # serve the production build locally
npm run typecheck # run TypeScript in --noEmit mode
```

No environment variables or API keys are required — the map uses [OpenFreeMap](https://openfreemap.org) tiles.

### Project structure

```
src/
  components/   Tailwind-styled React components
  data/         hills.json (mock data), towns.json (reference points)
  lib/          types, data layer (getHills), geo helpers, hash routing
design_handoff_hillfinder/
                visual reference — do NOT import from here
```

## Why "HillFinder"?

Because it finds hills. Naming is hard; descriptive beats clever.

## License

MIT.
