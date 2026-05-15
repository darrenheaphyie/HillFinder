import { useEffect, useRef } from "react";
import maplibregl, { type Map as MaplibreMap, type LngLatBoundsLike } from "maplibre-gl";
import type { Hill } from "../lib/types";
import { gradientColor } from "../lib/geo";
import { useHover } from "../lib/hover-context";

type HillMapProps = {
  hills: Hill[];
  /** When set, the map zooms to fit just this hill's polyline. */
  focusHillId?: string;
  /** Center of the map when no hills are visible. */
  fallbackCenter: { lat: number; lon: number };
  onPinClick?: (hillId: string) => void;
  /** When true, the map participates in list-map hover sync. */
  enableHoverSync?: boolean;
};

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function HillMap({
  hills,
  focusHillId,
  fallbackCenter,
  onPinClick,
  enableHoverSync = false,
}: HillMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; element: HTMLButtonElement }>>(new Map());
  const hover = useHover();

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
      markersRef.current.clear();
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
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();

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
        el.dataset.hillId = h.id;
        el.className =
          "w-3 h-3 rounded-full ring-2 ring-bg-elev shadow-md cursor-pointer transition-transform";
        el.style.background = gradientColor(h.avgGradient);
        el.setAttribute("aria-label", h.name ?? `Unnamed climb near ${h.nearestTown}`);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onPinClick?.(h.id);
        });
        if (enableHoverSync) {
          el.addEventListener("mouseenter", () => hover.setHoveredId(h.id));
          el.addEventListener("mouseleave", () => hover.setHoveredId(null));
        }
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([h.start.lon, h.start.lat])
          .addTo(map);
        markersRef.current.set(h.id, { marker, element: el });
      }

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
  }, [hills, focusHillId, onPinClick, enableHoverSync, hover.setHoveredId]);

  // Apply hover styling whenever hoveredId changes.
  useEffect(() => {
    if (!enableHoverSync) return;
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ element }, id) => {
      const active = id === hover.hoveredId;
      element.style.transform = active ? "scale(1.5)" : "";
      element.style.outline = active ? "2px solid #B85C38" : "";
      element.style.outlineOffset = active ? "1px" : "";
    });

    const apply = () => {
      hills.forEach((h) => {
        const lineId = `hill-line-${h.id}`;
        if (!map.getLayer(lineId)) return;
        const active = h.id === hover.hoveredId;
        map.setPaintProperty(lineId, "line-width", active ? 7 : 4);
        map.setPaintProperty(lineId, "line-opacity", hover.hoveredId == null || active ? 0.95 : 0.35);
      });
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [hover.hoveredId, hills, enableHoverSync]);

  return <div ref={containerRef} className="w-full h-full" role="application" aria-label="Map of hills" />;
}
