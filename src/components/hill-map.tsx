import { useEffect, useRef } from "react";
import maplibregl, { type Map as MaplibreMap, type LngLatBoundsLike } from "maplibre-gl";
import type { Hill } from "../lib/types";
import { gradientColor } from "../lib/geo";

type HillMapProps = {
  hills: Hill[];
  /** When set, the map zooms to fit just this hill's polyline. */
  focusHillId?: string;
  /** Center of the map when no hills are visible. */
  fallbackCenter: { lat: number; lon: number };
  onPinClick?: (hillId: string) => void;
};

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function HillMap({ hills, focusHillId, fallbackCenter, onPinClick }: HillMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [fallbackCenter.lon, fallbackCenter.lat],
      zoom: 9,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [fallbackCenter.lat, fallbackCenter.lon]);

  // Render hills + fit bounds when the set changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      // Clear previous layers/sources.
      hills.forEach((h) => {
        const lineId = `hill-line-${h.id}`;
        if (map.getLayer(lineId)) map.removeLayer(lineId);
        if (map.getSource(lineId)) map.removeSource(lineId);
      });
      const existingMarkers = (map as unknown as { _hillMarkers?: maplibregl.Marker[] })._hillMarkers ?? [];
      existingMarkers.forEach((m) => m.remove());

      const markers: maplibregl.Marker[] = [];
      for (const h of hills) {
        const lineId = `hill-line-${h.id}`;
        map.addSource(lineId, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: h.polyline.map((p) => [p.lon, p.lat]),
            },
            properties: {},
          },
        });
        map.addLayer({
          id: lineId,
          type: "line",
          source: lineId,
          paint: {
            "line-color": gradientColor(h.avgGradient),
            "line-width": 4,
            "line-opacity": 0.85,
          },
        });

        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "w-3 h-3 rounded-full ring-2 ring-bg-elev shadow-md cursor-pointer";
        el.style.background = gradientColor(h.avgGradient);
        el.setAttribute("aria-label", h.name ?? `Unnamed climb near ${h.nearestTown}`);
        el.addEventListener("click", () => onPinClick?.(h.id));
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([h.start.lon, h.start.lat])
          .addTo(map);
        markers.push(marker);
      }
      (map as unknown as { _hillMarkers?: maplibregl.Marker[] })._hillMarkers = markers;

      // Fit bounds.
      const focus = focusHillId ? hills.find((h) => h.id === focusHillId) : undefined;
      if (focus) {
        const lats = focus.polyline.map((p) => p.lat);
        const lons = focus.polyline.map((p) => p.lon);
        const bounds: LngLatBoundsLike = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: 60, animate: false });
      } else if (hills.length > 0) {
        const lats = hills.flatMap((h) => [h.start.lat, h.end.lat]);
        const lons = hills.flatMap((h) => [h.start.lon, h.end.lon]);
        const bounds: LngLatBoundsLike = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: 60, animate: false });
      }
    };

    if (map.isStyleLoaded()) {
      render();
    } else {
      map.once("load", render);
    }
  }, [hills, focusHillId, onPinClick]);

  return <div ref={containerRef} className="w-full h-full" role="application" aria-label="Map of hills" />;
}
