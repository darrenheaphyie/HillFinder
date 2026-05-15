// Topographic SVG map. Drawn from scratch — contour curves, river, roads,
// then hill polylines + pins layered on top. NOT a tile-based map.
//
// Coord space is 1000x720. Pass width via CSS; SVG preserveAspectRatio handles
// scaling. Hovering a hill (controlled from outside) raises its pin and
// emphasises its polyline.

const { useMemo, useRef, useState, useEffect } = React;

// --- Contour layer: rolling pseudo-isolines built as cubic-bezier loops.
function ContourLayer() {
  // Build a few nested elevation loops with slightly offset centres so the
  // terrain looks like a few low ridges + a higher area to the SW.
  const blobs = [
    { cx: 230, cy: 280, rx: 110, ry: 70, n: 5, step: 22, rot: 18 },
    { cx: 760, cy: 590, rx: 130, ry: 80, n: 6, step: 22, rot: -8 },
    { cx: 560, cy: 200, rx: 90,  ry: 60, n: 4, step: 24, rot: 10 },
    { cx: 880, cy: 320, rx: 65,  ry: 45, n: 3, step: 22, rot: 0  },
    { cx: 380, cy: 540, rx: 80,  ry: 55, n: 4, step: 20, rot: -25},
  ];
  const paths = [];
  blobs.forEach((b, bi) => {
    for (let i = 0; i < b.n; i++) {
      const rx = b.rx - i * b.step;
      const ry = b.ry - i * b.step * 0.7;
      if (rx < 8 || ry < 6) break;
      // wobbly ellipse made of 4 cubic-bezier segments
      const k = 0.5522847498;
      const ax = b.cx + rx, ay = b.cy;
      const bx = b.cx, by = b.cy - ry;
      const cx = b.cx - rx, cy = b.cy;
      const dx = b.cx, dy = b.cy + ry;
      const d = `M ${ax} ${ay}
        C ${b.cx + rx} ${b.cy - ry*k}, ${b.cx + rx*k} ${b.cy - ry}, ${bx} ${by}
        C ${b.cx - rx*k} ${b.cy - ry}, ${b.cx - rx} ${b.cy - ry*k}, ${cx} ${cy}
        C ${b.cx - rx} ${b.cy + ry*k}, ${b.cx - rx*k} ${b.cy + ry}, ${dx} ${dy}
        C ${b.cx + rx*k} ${b.cy + ry}, ${b.cx + rx} ${b.cy + ry*k}, ${ax} ${ay} Z`;
      paths.push(
        <path key={`b${bi}-${i}`} d={d} fill="none" stroke="var(--contour)"
          strokeWidth={i === 0 ? 0.9 : 0.5}
          transform={`rotate(${b.rot} ${b.cx} ${b.cy})`}
          opacity={i === 0 ? 0.5 : 0.32}
        />
      );
    }
  });
  return <g>{paths}</g>;
}

// River with smooth bezier curve and tributaries.
function River() {
  return (
    <g>
      <path d="M -20 480 C 120 460, 220 510, 340 470 S 540 380, 640 420 S 820 520, 1020 500"
            fill="none" stroke="var(--water)" strokeWidth="6" strokeLinecap="round" opacity="0.9"/>
      <path d="M 340 470 C 360 530, 330 600, 380 660" fill="none" stroke="var(--water)" strokeWidth="3" opacity="0.7"/>
      <path d="M 640 420 C 680 360, 660 260, 690 200" fill="none" stroke="var(--water)" strokeWidth="3" opacity="0.7"/>
      <path d="M 820 510 C 870 540, 920 570, 970 600" fill="none" stroke="var(--water)" strokeWidth="3" opacity="0.7"/>
    </g>
  );
}

// Road network — a few stylised arterial + minor roads.
function Roads() {
  return (
    <g>
      {/* arterial roads (cased: dark outline then white fill) */}
      <g stroke="var(--line-2)" fill="none">
        <path d="M -20 350 C 200 340, 400 360, 502 372 S 800 360, 1020 380" strokeWidth="7"/>
        <path d="M 502 -20 C 480 100, 510 250, 502 372 S 540 600, 560 740" strokeWidth="7"/>
        <path d="M -20 200 C 200 220, 360 280, 520 290 S 760 350, 1020 320" strokeWidth="5"/>
        <path d="M 60 -20 C 180 120, 280 240, 380 360 S 540 580, 700 740" strokeWidth="5"/>
        <path d="M 1020 60 C 880 200, 760 320, 660 460 S 460 700, 240 740" strokeWidth="5"/>
      </g>
      <g stroke="var(--road)" fill="none">
        <path d="M -20 350 C 200 340, 400 360, 502 372 S 800 360, 1020 380" strokeWidth="4.5"/>
        <path d="M 502 -20 C 480 100, 510 250, 502 372 S 540 600, 560 740" strokeWidth="4.5"/>
        <path d="M -20 200 C 200 220, 360 280, 520 290 S 760 350, 1020 320" strokeWidth="3"/>
        <path d="M 60 -20 C 180 120, 280 240, 380 360 S 540 580, 700 740" strokeWidth="3"/>
        <path d="M 1020 60 C 880 200, 760 320, 660 460 S 460 700, 240 740" strokeWidth="3"/>
      </g>
      {/* minor lanes */}
      <g stroke="var(--line)" fill="none" strokeWidth="1.5" strokeDasharray="0">
        <path d="M 150 60 L 220 180 L 180 290 L 280 380"/>
        <path d="M 820 100 L 760 200 L 820 330 L 760 440"/>
        <path d="M 380 540 L 440 600 L 540 580 L 620 640"/>
        <path d="M 700 60 L 660 160 L 720 240"/>
        <path d="M 60 540 L 160 580 L 240 540"/>
      </g>
    </g>
  );
}

// Settlements rendered as small ticks + labels.
const SETTLEMENTS = [
  { x: 502, y: 372, name: "KILKENNY",          size: "lg" },
  { x: 270, y: 290, name: "Tullaroan",         size: "sm" },
  { x: 458, y: 180, name: "Castlecomer",       size: "md" },
  { x: 360, y: 240, name: "Freshford",         size: "sm" },
  { x: 555, y: 480, name: "Bennettsbridge",    size: "sm" },
  { x: 720, y: 528, name: "Thomastown",        size: "sm" },
  { x: 690, y: 620, name: "Inistioge",         size: "sm" },
  { x: 820, y: 600, name: "Graiguenamanagh",   size: "sm" },
  { x: 380, y: 488, name: "Kells",             size: "sm" },
  { x: 640, y: 638, name: "Ballyhale",         size: "sm" },
  { x: 740, y: 680, name: "Mullinavat",        size: "sm" },
  { x: 750, y: 638, name: "Kilmacow",          size: "sm" },
  { x: 920, y: 540, name: "Slieverue",         size: "sm" },
];

function Settlements() {
  return (
    <g>
      {SETTLEMENTS.map((s, i) => {
        const isCity = s.size === "lg";
        return (
          <g key={i}>
            {isCity
              ? <rect x={s.x-3} y={s.y-3} width="6" height="6" fill="var(--ink)" />
              : <circle cx={s.x} cy={s.y} r={s.size === "md" ? 3 : 2.2} fill="var(--bg-elev)" stroke="var(--ink)" strokeWidth="1.2"/>}
            <text x={s.x + (isCity ? 9 : 7)} y={s.y + 4}
              fontSize={isCity ? 13 : 10}
              fontWeight={isCity ? 600 : 500}
              fill="var(--ink-2)"
              letterSpacing={isCity ? "0.06em" : "0.02em"}
              fontFamily="Geist, sans-serif"
              style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 3 }}
              >{s.name}</text>
          </g>
        );
      })}
    </g>
  );
}

// Build a smooth cubic-Bezier path string from an array of points.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const d = [`M ${pts[0].x} ${pts[0].y}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`);
  }
  return d.join(" ");
}

// Split a hill path into colored segments using its elevation profile grades.
function GradientPolyline({ hill, strokeWidth = 5, opacity = 1, filter }) {
  // Each adjacent point pair gets a colour matched to the grade at the
  // matching fractional position of the elevation profile.
  const pts = hill.path;
  if (pts.length < 2) return null;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    const idx = Math.min(hill.profile.length - 1, Math.floor(t * hill.profile.length));
    const grade = hill.profile[idx].grade;
    const color = window.gradeColorHex(grade);
    const d = smoothPath([pts[i-1] || pts[i], pts[i], pts[i+1], pts[i+2] || pts[i+1]]);
    // Use a 2-point segment so the colour change is per-segment
    const d2 = `M ${pts[i].x} ${pts[i].y} L ${pts[i+1].x} ${pts[i+1].y}`;
    segs.push(<path key={i} d={d2} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" opacity={opacity} filter={filter}/>);
  }
  return <g>{segs}</g>;
}

function TopoMap({
  hills,
  hovered, setHovered,
  selected, setSelected,
  // when single is set, render only that hill with gradient colouring and
  // zoom the viewBox to fit.
  single = null,
  showLegend = true,
  className = "",
  style = {},
}) {
  const theme = (React.useContext(window.ThemeCtx) || "paper");

  let viewBox = "0 0 1000 720";
  if (single) {
    const pts = single.path;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs) - 80, maxX = Math.max(...xs) + 80;
    const minY = Math.min(...ys) - 70, maxY = Math.max(...ys) + 70;
    const w = maxX - minX, h = maxY - minY;
    // expand to 4:3 aspect-ish
    const aspect = 1.5;
    const targetW = Math.max(w, h * aspect);
    const padX = (targetW - w) / 2;
    viewBox = `${minX - padX} ${minY} ${targetW} ${h}`;
  }

  return (
    <div className={"topomap " + className} style={{ position: "relative", width: "100%", height: "100%", background: "var(--paper)", overflow: "hidden", ...style }}>
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: "block" }}>
        {/* warm paper background with subtle grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0 L0 0 0 40" fill="none" stroke="var(--line)" strokeWidth="0.5" opacity="0.6"/>
          </pattern>
          <filter id="softshadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.25"/>
          </filter>
          <filter id="hudglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {theme === "paper" && (
          <g>
            <ContourLayer/>
            <River/>
            <Roads/>
            <Settlements/>
          </g>
        )}
        {theme === "wayfinder" && <window.WayfinderBackground/>}
        {theme === "race" && <window.RaceBackground/>}

        {/* Hill polylines */}
        {!single && hills.map(h => {
          const isHover = hovered === h.id;
          const isSel = selected === h.id;
          const highlight = isHover || isSel;
          const filter = theme === "race" ? "url(#hudglow)" : undefined;
          return (
            <g key={h.id}
               style={{ cursor: "pointer" }}
               onMouseEnter={() => setHovered && setHovered(h.id)}
               onMouseLeave={() => setHovered && setHovered(null)}
               onClick={() => setSelected && setSelected(h.id)}>
              {/* wider hit area */}
              <path d={smoothPath(h.path)} fill="none" stroke="transparent" strokeWidth="16"/>
              {/* shadow / halo when highlighted */}
              {highlight && <path d={smoothPath(h.path)} fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" opacity="0.18"/>}
              <path d={smoothPath(h.path)} fill="none" stroke="var(--accent)"
                    strokeWidth={highlight ? 4.5 : 3.2}
                    strokeLinecap="round" opacity={highlight ? 1 : 0.78}
                    filter={filter}/>
            </g>
          );
        })}

        {/* Single-hill gradient view (detail) */}
        {single && (
          <g>
            <path d={smoothPath(single.path)} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="9" strokeLinecap="round"/>
            <GradientPolyline hill={single} strokeWidth={6} filter={theme === "race" ? "url(#hudglow)" : undefined}/>
            {/* start/end markers */}
            <g>
              <circle cx={single.path[0].x} cy={single.path[0].y} r="9" fill="var(--bg-elev)" stroke="var(--ink)" strokeWidth="1.5"/>
              <text x={single.path[0].x} y={single.path[0].y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--ink)" fontFamily="Geist Mono, monospace">A</text>
            </g>
            <g>
              <circle cx={single.path[single.path.length-1].x} cy={single.path[single.path.length-1].y} r="9" fill="var(--ink)" stroke="var(--bg-elev)" strokeWidth="1.5"/>
              <text x={single.path[single.path.length-1].x} y={single.path[single.path.length-1].y + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--bg-elev)" fontFamily="Geist Mono, monospace">B</text>
            </g>
          </g>
        )}

        {/* Pins (results view only) */}
        {!single && hills.map((h, i) => {
          const isHover = hovered === h.id;
          const isSel = selected === h.id;
          const r = isHover || isSel ? 14 : 11;
          return (
            <g key={`pin-${h.id}`}
               style={{ cursor: "pointer", transition: "transform .15s" }}
               onMouseEnter={() => setHovered && setHovered(h.id)}
               onMouseLeave={() => setHovered && setHovered(null)}
               onClick={() => setSelected && setSelected(h.id)}>
              {(isHover || isSel) && <circle cx={h.pin.x} cy={h.pin.y} r="22" fill="var(--accent)" opacity="0.12"/>}
              <circle cx={h.pin.x} cy={h.pin.y} r={r} fill="var(--bg-elev)" stroke="var(--ink)" strokeWidth="1.2"/>
              <text x={h.pin.x} y={h.pin.y + 4} textAnchor="middle"
                    fontSize="11" fontWeight="600"
                    fill="var(--ink)" fontFamily="Geist Mono, monospace">
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* User location */}
        <g>
          <circle cx={USER_POS.x} cy={USER_POS.y} r="9" fill="var(--accent)" opacity="0.18"/>
          <circle cx={USER_POS.x} cy={USER_POS.y} r="4.5" fill="var(--accent)" stroke="var(--bg-elev)" strokeWidth="2"/>
        </g>

        {/* Distance line from "you" to the hovered hill — only on results map */}
        {!single && hovered && (() => {
          const h = hills.find(x => x.id === hovered);
          if (!h) return null;
          const ux = USER_POS.x, uy = USER_POS.y;
          const hx = h.pin.x, hy = h.pin.y;
          const midX = (ux + hx) / 2, midY = (uy + hy) / 2;
          // Slight perpendicular nudge for the label so it doesn't sit on the
          // line itself.
          const dx = hx - ux, dy = hy - uy;
          const len = Math.sqrt(dx*dx + dy*dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const labelX = midX + nx * 14;
          const labelY = midY + ny * 14;
          return (
            <g style={{ pointerEvents: "none" }}>
              <line x1={ux} y1={uy} x2={hx} y2={hy}
                stroke="var(--ink)" strokeWidth="1.2"
                strokeDasharray="5 4" opacity="0.55"/>
              <g>
                <rect x={labelX - 32} y={labelY - 10} width="64" height="18"
                  fill="var(--bg-elev)" stroke="var(--line-2)" strokeWidth="0.8"/>
                <text x={labelX} y={labelY + 3} textAnchor="middle"
                  fontFamily="var(--font-mono, 'Geist Mono'), monospace"
                  fontSize="10" fontWeight="500" fill="var(--ink)">
                  {h.distanceKm.toFixed(1)} km
                </text>
              </g>
            </g>
          );
        })()}

      </svg>

      {/* Map chrome: scale bar and attribution */}
      <div style={{ position: "absolute", left: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>
          <span style={{ display: "inline-block", width: 60, height: 4, borderLeft: "1px solid var(--ink-3)", borderRight: "1px solid var(--ink-3)", borderBottom: "1px solid var(--ink-3)", marginRight: 6 }} />
          5 KM
        </div>
        <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)" }}>
          52.65°N · 7.25°W · COUNTY KILKENNY · IE
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div style={{ position: "absolute", right: 12, bottom: 12, background: "var(--bg-elev)", border: "1px solid var(--line)", padding: "8px 10px", borderRadius: 4, fontSize: 10 }}>
          <div className="mono" style={{ color: "var(--ink-3)", fontSize: 9, letterSpacing: ".1em", marginBottom: 6 }}>GRADIENT</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[["<3","#4A9D5F"],["3–6","#A8C242"],["6–9","#E8B53C"],["9–12","#E8843B"],["12+","#C73E3E"]].map(([l,c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ display:"inline-block", width: 10, height: 3, background: c }}/>
                <span className="mono" style={{ color: "var(--ink-2)" }}>{l}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TopoMap, smoothPath, GradientPolyline });
