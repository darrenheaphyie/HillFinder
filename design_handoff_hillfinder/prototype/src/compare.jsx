// Compare mode: pick up to 3 hills from a slim list and see side-by-side
// columns + an overlaid elevation profile chart on a shared axis.

const { useState: useStateC, useMemo: useMemoC } = React;

function CompareView({ hills, filters, hovered, setHovered, onOpen, selected, setSelected }) {
  const filtered = useMemoC(() => {
    const f = window.filterHills(hills, filters);
    const sortFns = {
      closest:  (a,b) => a.distanceKm - b.distanceKm,
      steepest: (a,b) => b.avgGrade - a.avgGrade,
      longest:  (a,b) => b.lengthM - a.lengthM,
      ascent:   (a,b) => b.ascentM - a.ascentM,
    };
    return [...f].sort(sortFns[filters.sort] || sortFns.closest);
  }, [hills, filters]);

  const selectedHills = selected.map(id => HILLS.find(h => h.id === id)).filter(Boolean);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(x => x !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", flex: 1, minHeight: 0 }}>
      {/* Pick list */}
      <div style={{ borderRight: "1px solid var(--line)", overflowY: "auto", background: "var(--bg-elev)" }} className="scrollbar">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, background: "var(--bg-elev)", zIndex: 2 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 4 }}>SELECT TO COMPARE</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{selected.length} <span style={{ color: "var(--ink-3)", fontSize: 12 }}>/ 3 selected</span></span>
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="mono"
                style={{ fontSize: 10, padding: "4px 8px", background: "transparent", border: "1px solid var(--line-2)", color: "var(--ink-2)" }}>
                CLEAR
              </button>
            )}
          </div>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {filtered.map(h => {
            const isSel = selected.includes(h.id);
            const isHover = hovered === h.id;
            const disabled = !isSel && selected.length >= 3;
            return (
              <li key={h.id}
                onMouseEnter={() => setHovered(h.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => !disabled && toggle(h.id)}
                style={{
                  padding: "12px 18px", borderBottom: "1px solid var(--line)",
                  display: "flex", gap: 12, alignItems: "center",
                  background: isSel ? "var(--bg)" : (isHover ? "var(--bg)" : "transparent"),
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                }}>
                <div style={{
                  width: 16, height: 16, border: "1.5px solid " + (isSel ? "var(--ink)" : "var(--line-2)"),
                  background: isSel ? "var(--ink)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
                }}>
                  {isSel && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-5" stroke="var(--bg-elev)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
                    {h.distanceKm.toFixed(1)} km · {(h.lengthM/1000).toFixed(1)} km · <span style={{ color: window.gradeColorHex(h.avgGrade) }}>{h.avgGrade.toFixed(1)}%</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Compare panel */}
      <div style={{ overflowY: "auto", display: "flex", flexDirection: "column" }} className="scrollbar">
        {selected.length === 0 ? (
          <ComparePlaceholder/>
        ) : (
          <CompareCols hills={selectedHills} onOpen={onOpen}/>
        )}
      </div>
    </div>
  );
}

function ComparePlaceholder() {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", flexDirection: "column", gap: 10 }}>
      <div className="mono" style={{ fontSize: 11, letterSpacing: ".12em", color: "var(--ink-4)" }}>
        EMPTY · SELECT UP TO 3 HILLS
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-3)", maxWidth: 320, textAlign: "center" }}>
        Tick hills in the list to drop their stats into columns and overlay their elevation profiles.
      </div>
    </div>
  );
}

function StatRow({ label, values, fmt, color }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `160px repeat(${values.length}, 1fr)`,
      borderBottom: "1px solid var(--line)",
      alignItems: "stretch",
    }}>
      <div className="mono" style={{
        padding: "12px 18px", fontSize: 10, color: "var(--ink-3)",
        letterSpacing: ".1em", background: "var(--bg-elev)",
        borderRight: "1px solid var(--line)",
        display: "flex", alignItems: "center",
      }}>{label}</div>
      {values.map((v, i) => (
        <div key={i} className="mono" style={{
          padding: "12px 18px", fontSize: 16, fontWeight: 500,
          color: color ? color(v, i) : "var(--ink)",
          fontVariantNumeric: "tabular-nums",
          borderRight: i < values.length - 1 ? "1px solid var(--line)" : "none",
        }}>{fmt ? fmt(v) : v}</div>
      ))}
    </div>
  );
}

function CompareCols({ hills, onOpen }) {
  // shared elevation/distance axes
  const maxD = Math.max(...hills.map(h => h.lengthM));
  const allEles = hills.flatMap(h => h.profile.map(p => p.ele));
  const minE = Math.floor(Math.min(...allEles) / 10) * 10;
  const maxE = Math.ceil((Math.max(...allEles) + 5) / 10) * 10;
  const colors = ["var(--accent)", "#3A5F8A", "#2D6A4F"];

  return (
    <div>
      {/* Header row with names */}
      <div style={{
        display: "grid", gridTemplateColumns: `160px repeat(${hills.length}, 1fr)`,
        borderBottom: "1px solid var(--line-2)",
        position: "sticky", top: 0, background: "var(--bg)", zIndex: 2,
      }}>
        <div style={{ padding: "20px 18px", background: "var(--bg-elev)", borderRight: "1px solid var(--line)" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em" }}>COMPARING</div>
          <div className="mono" style={{ fontSize: 20, marginTop: 4 }}>{hills.length}</div>
        </div>
        {hills.map((h, i) => (
          <div key={h.id} style={{ padding: "20px 18px", borderRight: i < hills.length - 1 ? "1px solid var(--line)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, background: colors[i], display: "inline-block" }}/>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em" }}>{h.area.toUpperCase()}</span>
            </div>
            <button onClick={() => onOpen(h.id)} style={{
              background: "transparent", border: 0, padding: 0, textAlign: "left",
              fontSize: 18, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em",
            }}>{h.name}</button>
          </div>
        ))}
      </div>

      <StatRow label="DISTANCE FROM YOU" values={hills.map(h => h.distanceKm)} fmt={v => v.toFixed(1) + " km"}/>
      <StatRow label="LENGTH"           values={hills.map(h => h.lengthM)}
               fmt={v => v >= 1000 ? (v/1000).toFixed(2) + " km" : v + " m"}/>
      <StatRow label="TOTAL ASCENT"     values={hills.map(h => h.ascentM)} fmt={v => v + " m"}/>
      <StatRow label="AVG GRADIENT"     values={hills.map(h => h.avgGrade)}
               fmt={v => v.toFixed(1) + "%"}
               color={v => window.gradeColorHex(v)}/>
      <StatRow label="MAX GRADIENT"     values={hills.map(h => h.maxGrade)}
               fmt={v => v.toFixed(1) + "%"}
               color={v => window.gradeColorHex(v)}/>
      <StatRow label="START ELEV"       values={hills.map(h => h.startEle)} fmt={v => v + " m"}/>
      <StatRow label="TOP ELEV"         values={hills.map(h => h.topEle)} fmt={v => v + " m"}/>
      <StatRow label="SURFACE"          values={hills.map(h => window.SURFACE_LABEL[h.surface])}/>
      <StatRow label="STRAVA SEGMENTS"  values={hills.map(h => h.stravaSegments.length || "—")}/>

      {/* Overlaid elevation chart */}
      <div style={{ padding: "24px 28px 32px", background: "var(--bg-elev)", borderTop: "1px solid var(--line-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Elevation profiles, shared axes</h3>
          <div style={{ display: "flex", gap: 14 }}>
            {hills.map((h, i) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 2, background: colors[i] }}/>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{h.name}</span>
              </div>
            ))}
          </div>
        </div>
        <OverlayProfile hills={hills} colors={colors} maxD={maxD} minE={minE} maxE={maxE}/>
      </div>
    </div>
  );
}

function OverlayProfile({ hills, colors, maxD, minE, maxE }) {
  const width = 900, height = 240;
  const padL = 48, padR = 14, padT = 14, padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const xs = (d) => padL + (d / maxD) * innerW;
  const ys = (e) => padT + innerH - ((e - minE) / (maxE - minE)) * innerH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMidYMid meet">
      {/* y grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const e = minE + (maxE - minE) * t;
        return <g key={i}>
          <line x1={padL} x2={padL+innerW} y1={ys(e)} y2={ys(e)} stroke="var(--line)" strokeDasharray="2 4"/>
          <text x={padL - 6} y={ys(e) + 3} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono, Geist Mono), monospace">{Math.round(e)}</text>
        </g>;
      })}
      {/* axes */}
      <line x1={padL} x2={padL+innerW} y1={padT+innerH} y2={padT+innerH} stroke="var(--ink-3)"/>
      <line x1={padL} x2={padL} y1={padT} y2={padT+innerH} stroke="var(--ink-3)"/>
      {/* x labels (every km) */}
      {[0, 1000, 2000, 3000, 4000].filter(t => t <= maxD).map((t, i) => (
        <text key={i} x={xs(t)} y={padT+innerH+14} textAnchor="middle" fontSize="10"
          fill="var(--ink-3)" fontFamily="var(--font-mono, Geist Mono), monospace">{(t/1000)}k</text>
      ))}
      <text x={padL+innerW} y={padT+innerH+26} textAnchor="end" fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono, Geist Mono), monospace" letterSpacing="0.1em">DISTANCE (m)</text>
      <text x={padL-6} y={padT-2} textAnchor="end" fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono, Geist Mono), monospace">m</text>

      {/* lines */}
      {hills.map((h, i) => {
        const d = "M " + h.profile.map(p => `${xs(p.d)},${ys(p.ele)}`).join(" L ");
        return <g key={h.id}>
          <path d={d + ` L ${xs(h.profile[h.profile.length-1].d)} ${padT+innerH} L ${xs(0)} ${padT+innerH} Z`}
                fill={colors[i]} opacity="0.08"/>
          <path d={d} fill="none" stroke={colors[i]} strokeWidth="2" strokeLinejoin="round"/>
        </g>;
      })}
    </svg>
  );
}

window.CompareView = CompareView;
