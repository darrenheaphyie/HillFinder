// Elevation profile chart. Two flavours:
//   <Sparkline> — inline 80x18 chart, monochrome, used in result cards.
//   <ElevationProfile> — full chart with axes and gradient-coloured fill,
//                       used on the detail page. Supports hover that emits
//                       a "fraction along profile" via onHover.
//
// Profile is an array of {d, ele, grade}.

const { useState: useStateP, useRef: useRefP, useMemo: useMemoP } = React;

function Sparkline({ profile, width = 86, height = 22, color = "var(--ink-2)" }) {
  if (!profile || profile.length < 2) return null;
  const eles = profile.map(p => p.ele);
  const minE = Math.min(...eles), maxE = Math.max(...eles);
  const range = Math.max(1, maxE - minE);
  const w = width, h = height;
  const xs = (i) => (i / (profile.length - 1)) * (w - 2) + 1;
  const ys = (e) => h - 2 - ((e - minE) / range) * (h - 4);
  let d = `M ${xs(0)} ${h - 1}`;
  profile.forEach((p, i) => { d += ` L ${xs(i)} ${ys(p.ele)}`; });
  d += ` L ${xs(profile.length - 1)} ${h - 1} Z`;
  // baseline + filled silhouette
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={d} fill={color} opacity="0.18"/>
      <path d={d.replace(/Z$/,"").replace(/^M [^L]+L/, (m, ...args)=>m).split(" Z")[0]}
            fill="none" stroke={color} strokeWidth="1.2" opacity="0.85"/>
    </svg>
  );
}

function ElevationProfile({ profile, height = 220, onHover, hoverFrac }) {
  const ref = useRefP(null);
  const [width, setWidth] = useStateP(700);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setWidth(Math.max(200, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padL = 44, padR = 12, padT = 14, padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const eles = profile.map(p => p.ele);
  const minE = Math.floor(Math.min(...eles) / 10) * 10;
  const maxE = Math.ceil((Math.max(...eles) + 5) / 10) * 10;
  const maxD = profile[profile.length - 1].d;
  const xs = (d) => padL + (d / maxD) * innerW;
  const ys = (e) => padT + innerH - ((e - minE) / (maxE - minE)) * innerH;

  // Build gradient-coloured rectangles between samples — each pair becomes
  // a quad polygon (top = line between samples, bottom = baseline) filled
  // with that segment's grade colour.
  const polys = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i], b = profile[i+1];
    const c = window.gradeColorHex((a.grade + b.grade) / 2);
    const ax = xs(a.d), ay = ys(a.ele);
    const bx = xs(b.d), by = ys(b.ele);
    polys.push(
      <polygon key={i}
        points={`${ax},${ay} ${bx},${by} ${bx},${padT+innerH} ${ax},${padT+innerH}`}
        fill={c} opacity="0.85"/>
    );
  }

  // Y axis ticks at sensible elevation increments
  const yTicks = [];
  const tickStep = (maxE - minE) > 200 ? 50 : (maxE - minE) > 100 ? 20 : 10;
  for (let e = minE; e <= maxE; e += tickStep) yTicks.push(e);

  // X axis ticks every ~500m, but adapt
  const xTicks = [];
  const xStep = maxD > 3000 ? 500 : maxD > 1500 ? 250 : 100;
  for (let d = 0; d <= maxD; d += xStep) xTicks.push(d);

  // Hover handling
  const onMove = (e) => {
    if (!ref.current || !onHover) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < padL || x > padL + innerW) { onHover(null); return; }
    const frac = (x - padL) / innerW;
    onHover(Math.max(0, Math.min(1, frac)));
  };
  const onLeave = () => onHover && onHover(null);

  // current hover point
  let hoverPt = null;
  if (hoverFrac != null) {
    const i = Math.min(profile.length - 1, Math.floor(hoverFrac * (profile.length - 1)));
    const next = Math.min(profile.length - 1, i + 1);
    const localT = hoverFrac * (profile.length - 1) - i;
    const ele = profile[i].ele + (profile[next].ele - profile[i].ele) * localT;
    const d = hoverFrac * maxD;
    const grade = profile[i].grade;
    hoverPt = { x: xs(d), y: ys(ele), ele, d, grade };
  }

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", userSelect: "none" }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={onLeave} style={{ display: "block", cursor: "crosshair" }}>
        {/* grid */}
        <g>
          {yTicks.map((t,i) => (
            <line key={i} x1={padL} x2={padL+innerW} y1={ys(t)} y2={ys(t)}
                  stroke="var(--line)" strokeWidth="1" strokeDasharray="2,3"/>
          ))}
        </g>
        {/* gradient-coloured fill */}
        <g>{polys}</g>
        {/* line on top */}
        <path d={"M " + profile.map(p => `${xs(p.d)},${ys(p.ele)}`).join(" L ")}
              fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity="0.7"/>
        {/* axes */}
        <line x1={padL} x2={padL+innerW} y1={padT+innerH} y2={padT+innerH} stroke="var(--ink-3)" strokeWidth="1"/>
        <line x1={padL} x2={padL} y1={padT} y2={padT+innerH} stroke="var(--ink-3)" strokeWidth="1"/>
        {/* y labels */}
        {yTicks.map((t,i)=>(
          <text key={i} x={padL-6} y={ys(t)+3} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="Geist Mono, monospace">
            {t}
          </text>
        ))}
        <text x={padL-6} y={padT-2} textAnchor="end" fontSize="9" fill="var(--ink-3)" fontFamily="Geist Mono, monospace">m</text>
        {/* x labels */}
        {xTicks.map((t,i)=>(
          <text key={i} x={xs(t)} y={padT+innerH+14} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="Geist Mono, monospace">
            {t >= 1000 ? (t/1000).toFixed(t%1000===0?0:1)+"k" : t}
          </text>
        ))}
        <text x={padL+innerW} y={padT+innerH+26} textAnchor="end" fontSize="9" fill="var(--ink-4)" fontFamily="Geist Mono, monospace" letterSpacing="0.1em">DISTANCE (m)</text>

        {/* hover guide */}
        {hoverPt && (
          <g>
            <line x1={hoverPt.x} x2={hoverPt.x} y1={padT} y2={padT+innerH} stroke="var(--ink)" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"/>
            <circle cx={hoverPt.x} cy={hoverPt.y} r="5" fill={window.gradeColorHex(hoverPt.grade)} stroke="var(--bg-elev)" strokeWidth="2"/>
          </g>
        )}
      </svg>
      {hoverPt && (
        <div className="mono" style={{
          position: "absolute",
          left: Math.min(width - 170, Math.max(8, hoverPt.x + 8)),
          top: 6,
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          padding: "5px 8px",
          fontSize: 11,
          color: "var(--ink)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <span style={{ color: "var(--ink-3)" }}>D </span>{(hoverPt.d/1000).toFixed(2)} km{" "}
          <span style={{ color: "var(--ink-3)" }}>· ELE </span>{Math.round(hoverPt.ele)} m{" "}
          <span style={{ color: "var(--ink-3)" }}>· GRD </span>
          <span style={{ color: window.gradeColorHex(hoverPt.grade) }}>{hoverPt.grade.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Sparkline, ElevationProfile });
