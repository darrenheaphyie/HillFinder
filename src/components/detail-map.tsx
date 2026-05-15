import { useEffect, useRef } from "react";
import maplibregl, { type LngLatBoundsLike, type Map as MaplibreMap } from "maplibre-gl";
import type { Hill } from "../lib/types";
import { gradientColor } from "../lib/geo";

type DetailMapProps = {
  hill: Hill;
  /** Distance (m) along the climb to highlight with a marker. `null` for none. */
  highlightDistanceM: number | null;
};

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

function interpolateAlongPolyline(
  polyline: { lat: number; lon: number }[],
  totalLengthM: number,
  distanceM: number,
): { lat: number; lon: number } {
  // Approximate: treat polyline segments as uniformly spaced along arc length.
  // For our synthesized profiles this is good enough — the climb length is
  // distributed across the polyline points evenly.
  const t = Math.max(0, Math.min(1, distanceM / totalLengthM));
  const idx = t * (polyline.length - 1);
  const i = Math.floor(idx);
  const frac = idx - i;
  const a = polyline[i];
  const b = polyline[Math.min(i + 1, polyline.length - 1)];
  return {
    lat: a.lat + (b.lat - a.lat) * frac,
    lon: a.lon + (b.lon - a.lon) * frac,
  };
}

function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const phi1 = toRad(a.lat);
  const phi2 = toRad(b.lat);
  const dl = toRad(b.lon - a.lon);
  const y = Math.sin(dl) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function DetailMap({ hill, highlightDistanceM }: DetailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const arrowRef = useRef<maplibregl.Marker | null>(null);
  const highlightRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [hill.start.lon, hill.start.lat],
      zoom: 13,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hill.start.lat, hill.start.lon]);

  // Render the segment-coloured polyline + direction arrow whenever the hill changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      // Build per-segment GeoJSON features keyed by gradient colour.
      const N = hill.polyline.length;
      const features: GeoJSON.Feature[] = [];
      for (let i = 0; i < N - 1; i++) {
        const t = i / Math.max(1, N - 2);
        // Sample gradient at this segment from elevation profile.
        const profileIdx = Math.min(
          hill.elevationProfile.length - 1,
          Math.round(t * (hill.elevationProfile.length - 1)),
        );
        const grade = hill.elevationProfile[profileIdx].gradient;
        features.push({
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [hill.polyline[i].lon, hill.polyline[i].lat],
              [hill.polyline[i + 1].lon, hill.polyline[i + 1].lat],
            ],
          },
          properties: { color: gradientColor(grade), gradient: grade },
        });
      }

      const sourceId = "detail-segments";
      if (map.getLayer(sourceId)) map.removeLayer(sourceId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      map.addSource(sourceId, {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      map.addLayer({
        id: sourceId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-opacity": 0.92,
        },
      });

      // Fit bounds to the polyline.
      const lats = hill.polyline.map((p) => p.lat);
      const lons = hill.polyline.map((p) => p.lon);
      const bounds: LngLatBoundsLike = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ];
      map.fitBounds(bounds, { padding: 50, animate: false });

      // Direction arrow at the climb top.
      arrowRef.current?.remove();
      const second = hill.polyline[hill.polyline.length - 2];
      const top = hill.polyline[hill.polyline.length - 1];
      const angle = bearingDeg(second, top);
      const arrowEl = document.createElement("div");
      arrowEl.setAttribute("aria-hidden", "true");
      arrowEl.style.cssText = `
        width: 0; height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 14px solid #0B121C;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      `;
      // The triangle points "up" — rotate so it points along the bearing.
      arrowEl.style.transform = `rotate(${angle}deg)`;
      arrowRef.current = new maplibregl.Marker({ element: arrowEl, anchor: "center" })
        .setLngLat([top.lon, top.lat])
        .addTo(map);
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [hill]);

  // Highlight marker — shown when hovering the profile.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    highlightRef.current?.remove();
    if (highlightDistanceM == null) return;
    const pos = interpolateAlongPolyline(hill.polyline, hill.lengthM, highlightDistanceM);
    const el = document.createElement("div");
    el.style.cssText = `
      width: 14px; height: 14px;
      border-radius: 50%;
      background: #B85C38;
      border: 3px solid #FFFFFF;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    `;
    highlightRef.current = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([pos.lon, pos.lat])
      .addTo(map);
  }, [highlightDistanceM, hill]);

  return <div ref={containerRef} className="w-full h-full" role="application" aria-label="Climb on map" />;
}
