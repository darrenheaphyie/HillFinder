import { useCallback, useEffect, useState } from "react";
import { getHillById } from "../lib/hills";
import type { Hill } from "../lib/types";
import { ElevationProfile } from "./elevation-profile";
import { DetailMap } from "./detail-map";
import { gradientColor } from "../lib/geo";

type DetailViewProps = {
  hillId: string;
  onBack: () => void;
};

type DetailLoad =
  | { kind: "loading" }
  | { kind: "loaded"; hill: Hill | undefined }
  | { kind: "error"; message: string };

export function DetailView({ hillId, onBack }: DetailViewProps) {
  const [load, setLoad] = useState<DetailLoad>({ kind: "loading" });
  const [highlightDistanceM, setHighlightDistanceM] = useState<number | null>(null);

  const fetchHill = useCallback(() => {
    setLoad({ kind: "loading" });
    getHillById(hillId)
      .then((h) => {
        setLoad({ kind: "loaded", hill: h });
        if (h?.name) document.title = `${h.name} · HillFinder`;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        setLoad({ kind: "error", message });
      });
  }, [hillId]);

  useEffect(() => {
    fetchHill();
  }, [fetchHill]);

  // Escape closes the detail view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  if (load.kind === "loading") {
    return (
      <div className="p-8 max-w-3xl animate-pulse">
        <div className="h-8 w-2/3 bg-line rounded" />
        <div className="h-4 w-1/3 bg-line rounded mt-2" />
        <div className="h-72 bg-line rounded mt-6" />
      </div>
    );
  }

  if (load.kind === "error") {
    return (
      <div className="p-8 max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-accent hover:text-accent-2"
        >
          ← Back to results
        </button>
        <h1 className="font-serif text-3xl text-ink mt-4">Couldn't load this hill</h1>
        <p className="mt-2 text-ink-2">
          {load.message && <em>({load.message}) </em>}
        </p>
        <button
          type="button"
          onClick={fetchHill}
          className="mt-3 text-sm bg-accent text-bg-elev px-3 py-1.5 rounded-md hover:bg-accent-2"
        >
          Retry
        </button>
      </div>
    );
  }

  const hill = load.hill;
  if (!hill) {
    return (
      <div className="p-8 max-w-xl">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-accent hover:text-accent-2"
        >
          ← Back to results
        </button>
        <h1 className="font-serif text-3xl text-ink mt-4">Hill not found</h1>
        <p className="mt-2 text-ink-2">
          We couldn't find a hill with id <code className="font-mono text-sm">{hillId}</code>.
          It may have been removed or the link may be stale.
        </p>
      </div>
    );
  }

  const displayName = hill.name ?? `Unnamed climb near ${hill.nearestTown}`;
  const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${hill.start.lat},${hill.start.lon}`;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-accent hover:text-accent-2 mb-3"
        >
          ← Back to results
        </button>
        <header className="mb-4">
          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            {displayName}
          </h1>
          <p className="text-sm text-ink-3 mt-1">{hill.nearestTown}</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 rounded-lg overflow-hidden border border-line bg-bg-elev">
            <DetailMap hill={hill} highlightDistanceM={highlightDistanceM} />
          </div>
          <ElevationProfile hill={hill} onHoverDistance={setHighlightDistanceM} />
        </div>

        <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <DetailStat label="Length" value={`${(hill.lengthM / 1000).toFixed(2)} km`} />
          <DetailStat label="Total ascent" value={`${hill.totalAscentM} m`} />
          <DetailStat
            label="Avg gradient"
            value={`${hill.avgGradient.toFixed(1)}%`}
            color={gradientColor(hill.avgGradient)}
          />
          <DetailStat
            label="Max gradient"
            value={`${hill.maxGradient.toFixed(1)}%`}
            color={gradientColor(hill.maxGradient)}
          />
          <DetailStat label="Start elevation" value={`${hill.startElevationM} m`} />
          <DetailStat label="Top elevation" value={`${hill.topElevationM} m`} />
          <DetailStat label="Surface" value={hill.surface} />
          <DetailStat label="Direction" value={hill.direction} />
        </dl>

        <div className="mt-5">
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent text-bg-elev px-4 py-2 rounded-md font-medium hover:bg-accent-2"
          >
            Get directions
          </a>
        </div>

        <section className="mt-8" aria-labelledby="strava-heading">
          <div className="flex items-baseline justify-between mb-3">
            <h2 id="strava-heading" className="font-serif text-2xl text-ink">
              Strava segments
            </h2>
            <span className="text-xs font-mono text-ink-3">
              {hill.stravaSegments.length}{" "}
              {hill.stravaSegments.length === 1 ? "segment" : "segments"}
            </span>
          </div>
          {hill.stravaSegments.length === 0 ? (
            <div className="bg-bg-elev border border-dashed border-line-2 rounded-lg px-4 py-5 flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-block w-8 h-8 rounded-full border-2 border-dashed border-line-2 shrink-0"
              />
              <p className="text-sm text-ink-2">
                No Strava segments on this hill yet.{" "}
                <span className="text-ink-3">You might be the first.</span>
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {hill.stravaSegments.map((seg) => (
                <li
                  key={seg.id}
                  className="bg-bg-elev border border-line rounded-lg p-3"
                >
                  <a
                    href={`https://www.strava.com/segments/${seg.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between gap-3 text-ink hover:text-accent"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{seg.name}</div>
                      <p className="text-xs text-ink-3 mt-0.5">
                        {(seg.lengthM / 1000).toFixed(2)} km · {seg.avgGradient.toFixed(1)}%
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-ink-3 group-hover:text-accent text-sm shrink-0"
                    >
                      Open ↗
                    </span>
                    <span className="sr-only">(opens Strava in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-bg-elev border border-line rounded-lg p-3">
      <dt className="text-[11px] uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="font-mono text-ink mt-1" style={color ? { color } : undefined}>
        {value}
      </dd>
    </div>
  );
}
