# CLAUDE.md

Project memory for Claude Code. Read this first on every session.

## What this is

HillFinder is a web app for runners and cyclists to find hills suitable for hill repeats or sustained climbs in their local area. Users filter by length, gradient, total ascent, surface type, and distance from a chosen location, and see results as a synchronised list and map with detailed elevation profiles.

The MVP is scoped to **County Kilkenny, Ireland** — chosen because the maintainer knows the local terrain well enough to validate algorithm output by hand.

## Current phase

**Frontend mock with hand-crafted data.** No real elevation pipeline yet. No backend. The data layer is a static JSON file and the app reads it through a single fetch boundary that will later swap to an API call.

Do not build pipeline, detection, or backend code in this phase unless explicitly asked. The goal right now is to get the UI shape and interactions right against realistic mock data.

## Stack

- **React** + **Vite** + **TypeScript**
- **Tailwind CSS** for styling
- **MapLibre GL** for maps (using OpenFreeMap tiles, no API key required)
- **Recharts** for the elevation profile chart
- **No state management library** — React state and URL params are enough at this scale

## Conventions

- Functional components, hooks only (no class components)
- File names: kebab-case (`hill-card.tsx`)
- Component names: PascalCase (`HillCard`)
- Tailwind for all styling; avoid inline styles and separate CSS files where possible
- TypeScript strict mode; prefer explicit types on public function signatures
- Keep components small and composable; split when a file passes ~150 lines

## Data layer — important

All hill data is read through a single function:

```ts
// src/lib/hills.ts
export async function getHills(filters: HillFilters): Promise<Hill[]>
```

Today this reads from `src/data/hills.json`. Later it will hit an API. **Keep this boundary clean** — do not sprinkle data fetching or mock data through components. The whole point of this phase is to get the data shape right so the pipeline phase has a clear target.

The `Hill` type lives in `src/lib/types.ts` and is the contract between the frontend, `src/data/hills.json`, and the future pipeline/API. The type is locked — fields are documented in `types.ts`. When the type changes, the JSON updates with it (and vice versa).

A runtime validator (`src/lib/validate.ts`) checks `hills.json` against the type at module load. Run `npm run validate:hills` to validate from the CLI.

## What's in scope right now

- Results view: list + map, synced hover, filter controls
- Hill detail view: gradient-coloured map polyline, elevation profile, stats, Strava section
- Mobile layout: this app will be used in the field, mobile is a first-class case
- Empty / single / many result states
- Preserving filter state when navigating between views

## What's explicitly out of scope right now

- Authentication, accounts, login
- Saving favourite hills
- Route planning between hills
- Real elevation data ingestion
- Hill detection algorithm
- Backend / API server
- Search by place name (assume location is current location or a fixed Kilkenny point)
- Hosting / deployment concerns

## The map

MapLibre GL with OpenFreeMap tiles. No Mapbox token, no API keys. If a feature seems to need a paid provider, flag it rather than silently adding one.

## Mobile

Test mobile layouts seriously. Imagine a runner standing at a road junction in the rain holding their phone. Tap targets need to be generous. The map needs to be controllable with one thumb. The list-to-detail-to-back flow needs to feel obvious.

## Things to flag rather than guess

- Anything that adds a new dependency — mention it before adding
- Anything that introduces an API key or paid service
- Anything that changes the shape of the `Hill` type or the `getHills` boundary
- Anything that touches `src/data/hills.json` structure (vs just content)

## Things to just do

- Fix obvious bugs you spot
- Improve accessibility (semantic HTML, aria labels, keyboard nav)
- Tighten Tailwind classes, remove unused imports
- Improve type safety where it's currently loose

## Update this file

When meaningful decisions get made — a new convention, a stack change, a phase shift — update this file in the same commit. It's a living document, not a setup-time artefact.

## Scaffold notes

The Vite + React + TS + Tailwind scaffold lives at the repo root. The original Claude Design handoff (static HTML + raw `.jsx` prototype) sits untouched in `design_handoff_hillfinder/` and acts as the visual reference, not as runtime code. Don't import from there — port what you need into `src/`.

The map component (`src/components/hill-map.tsx`) uses MapLibre GL with OpenFreeMap (positron) tiles. The design prototype's stylised SVG topomap is not used — it was a presentational mock.

Run commands are in the README. `npm run build` runs `tsc -b` first, so type errors block the build.

## Dark mode

Dark mode is deferred to post-MVP — tracked in issue #37. Until then, write light-palette Tailwind classes only and do **not** add `dark:` variants. The prototype's dark palette and "sun-sweep" transition remain in `design_handoff_hillfinder/` as a reference.

## Result list performance

The MVP dataset is 15 hills, so the list is rendered as plain elements with no virtualisation or pagination. If the dataset grows past ~50, revisit — `react-window` is the preferred option (small footprint, well-understood). Don't add virtualisation pre-emptively.

## Overlapping map pins

Pins whose start coordinates are within ~200m of each other are visually offset (jittered around their cluster centroid) — see `jitterOverlappingPins` in `src/components/hill-map.tsx`. We picked Option A from issue #13 (jitter) over clustering or zoom-on-click because it requires no MapLibre plugin and stays readable at all zoom levels. If a future dataset has 5+ pins overlapping the same point, this will start to feel cramped — at that point, swap to MapLibre's built-in clustering on the geojson source.
