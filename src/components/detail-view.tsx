import { useEffect, useState } from "react";
import { getHillById } from "../lib/hills";
import { getTown, DEFAULT_TOWN_ID } from "../lib/towns";
import { useHashParam } from "../lib/hash-route";
import type { Hill } from "../lib/types";
import { ElevationProfile } from "./elevation-profile";
import { HillMap } from "./hill-map";
import { gradientColor } from "../lib/geo";

type DetailViewProps = {
  hillId: string;
  onBack: () => void;
};

export function DetailView({ hillId, onBack }: DetailViewProps) {
  const [hill, setHill] = useState<Hill | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [townParam] = useHashParam("town");
  const town = getTown(townParam ?? DEFAULT_TOWN_ID);

  useEffect(() => {
    let cancelled = false;
    getHillById(hillId).then((h) => {
      if (cancelled) return;
      setHill(h);
      setLoaded(true);
      if (h?.name) document.title = `${h.name} · HillFinder`;
    });
    return () => {
      cancelled = true;
    };
  }, [hillId]);

  // Escape closes the detail view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

  if (!loaded) {
    return <div className="p-8 text-ink-3">Loading…</div>;
  }

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
            <HillMap
              hills={[hill]}
              focusHillId={hill.id}
              fallbackCenter={{ lat: town.lat, lon: town.lon }}
            />
          </div>
          <ElevationProfile hill={hill} />
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

        <section className="mt-8">
          <h2 className="font-serif text-2xl text-ink mb-3">Strava segments</h2>
          {hill.stravaSegments.length === 0 ? (
            <p className="text-sm text-ink-3">
              No Strava segments on this hill yet. You might be the first.
            </p>
          ) : (
            <ul className="space-y-2">
              {hill.stravaSegments.map((seg) => (
                <li
                  key={seg.id}
                  className="bg-bg-elev border border-line rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <a
                      href={`https://www.strava.com/segments/${seg.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink font-medium hover:text-accent"
                    >
                      {seg.name}
                    </a>
                    <p className="text-xs text-ink-3 mt-0.5">
                      {(seg.lengthM / 1000).toFixed(2)} km · {seg.avgGradient.toFixed(1)}%
                    </p>
                  </div>
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
