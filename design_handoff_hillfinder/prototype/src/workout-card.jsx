// Printable workout card — fits in a jersey pocket. A5 portrait, monochrome,
// monospaced numbers, designed to be print-only (Cmd/Ctrl+P).
//
// Usage: <PrintableCard session={...} hill={...} repAscent={...} repLength={...} open={...} onClose={...}/>

const { useEffect: useEW } = React;

function PrintableCard({ open, onClose, session, hill, repAscent, repLength }) {
  useEW(() => {
    if (!open) return;
    document.body.classList.add("print-mode");
    return () => document.body.classList.remove("print-mode");
  }, [open]);

  useEW(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const totalAsc = session.reps * repAscent;
  const totalMin = session.reps * session.repMin + Math.max(0, session.reps - 1) * session.restMin;
  const repLengthLabel = repLength >= 1000 ? (repLength/1000).toFixed(2) + " km" : repLength + " m";

  // Reps timeline boxes: each rep is `repMin` min of work + `restMin` min rest
  const blocks = [];
  for (let i = 0; i < session.reps; i++) {
    blocks.push({ kind: "work", min: session.repMin, idx: i + 1 });
    if (i < session.reps - 1) blocks.push({ kind: "rest", min: session.restMin });
  }

  return (
    <div className="print-overlay" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="print-card" style={{
        width: 595, maxWidth: "100%", maxHeight: "100%", overflow: "auto",
        background: "#FFFFFF", color: "#000000",
        padding: "40px 44px",
        position: "relative",
        boxShadow: "0 30px 80px rgba(0,0,0,.4)",
        fontFamily: "var(--font-ui, 'Geist'), system-ui, sans-serif",
      }}>
        <button onClick={onClose} className="no-print" style={{
          position: "absolute", top: 14, right: 14,
          background: "transparent", border: "1px solid #CCC",
          width: 28, height: 28, cursor: "pointer", color: "#666",
        }}>×</button>

        <div className="no-print" style={{
          display: "flex", gap: 8, marginBottom: 24,
        }}>
          <button onClick={() => window.print()} style={{
            background: "#000", color: "#FFF", border: 0,
            padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4V1.5h6V4M4 11h-2V5h10v6h-2M4 9h6v4H4z"/>
            </svg>
            Print / Save as PDF
          </button>
          <span style={{ fontSize: 11, color: "#888", alignSelf: "center" }}>
            Esc to close · Ctrl/Cmd+P also works
          </span>
        </div>

        {/* Top band */}
        <div style={{ borderBottom: "2px solid #000", paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 11, letterSpacing: ".15em", fontWeight: 600 }}>
              HILLFINDER · WORKOUT
            </div>
            <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 11, color: "#555" }}>
              {new Date().toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
            {session.reps} × {session.repMin} min @ {hill ? hill.name : "—"}
          </div>
          {hill && (
            <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 12, color: "#555", marginTop: 4 }}>
              {hill.area} · {hill.distanceKm.toFixed(1)} km from Kilkenny city
            </div>
          )}
        </div>

        {/* Big number panel */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, borderTop: "1px solid #000", borderLeft: "1px solid #000" }}>
          <PrintStat label="REPS"           value={session.reps}/>
          <PrintStat label="REP DURATION"   value={`${session.repMin} min`}/>
          <PrintStat label="RECOVERY"       value={`${session.restMin} min`}/>
          <PrintStat label="TARGET GRADE"   value={`${session.grade}%`}/>
          <PrintStat label="ASCENT / REP"   value={`+${repAscent} m`}/>
          <PrintStat label="REP LENGTH"     value={repLengthLabel}/>
        </div>

        {/* Reps timeline */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 10, letterSpacing: ".12em", color: "#555", marginBottom: 8 }}>
            TIMELINE · {totalMin} MIN TOTAL · +{totalAsc} M ASCENT
          </div>
          <div style={{ display: "flex", height: 28, border: "1px solid #000" }}>
            {blocks.map((b, i) => (
              <div key={i} style={{
                flex: b.min,
                background: b.kind === "work" ? "#000" : "#FFFFFF",
                color: b.kind === "work" ? "#FFFFFF" : "#000",
                borderRight: i < blocks.length - 1 ? "1px solid #000" : "none",
                fontFamily: "var(--font-mono, 'Geist Mono'), monospace",
                fontSize: 10, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center",
                letterSpacing: ".06em",
              }}>
                {b.kind === "work" ? `R${b.idx} ${b.min}'` : `${b.min}'`}
              </div>
            ))}
          </div>
        </div>

        {/* Hill profile sketch */}
        {hill && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 10, letterSpacing: ".12em", color: "#555", marginBottom: 8 }}>
              HILL PROFILE · {(hill.lengthM/1000).toFixed(2)} km · +{hill.ascentM} m · {hill.avgGrade.toFixed(1)}% avg
            </div>
            <PrintProfile profile={hill.profile}/>
          </div>
        )}

        {/* Coach notes */}
        <div style={{ marginTop: 24, padding: "14px 0", borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
          <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 10, letterSpacing: ".12em", color: "#555", marginBottom: 6 }}>
            NOTES
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: "#222" }}>
            <li>Warm up 10–15 min easy before first rep.</li>
            <li>Run reps at consistent effort, not pace — gradient varies.</li>
            <li>Recovery: jog or walk back to start, target full breath recovery.</li>
            <li>Cool down 10 min easy after final rep.</li>
          </ul>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 10, color: "#888",
        }}>
          <span>HILLFINDER · COUNTY KILKENNY</span>
          <span>{hill && `52.6°N 7.2°W · ${hill.direction}`}</span>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: #FFF !important; }
          .no-print { display: none !important; }
          body > div { visibility: hidden; }
          .print-overlay, .print-overlay * { visibility: visible !important; }
          .print-overlay { position: absolute !important; inset: 0 !important; background: #FFF !important; padding: 0 !important; display: block !important; }
          .print-card { box-shadow: none !important; width: 100% !important; max-width: 100% !important; padding: 32px !important; }
          @page { size: A5 portrait; margin: 0; }
        }
      `}</style>
    </div>
  );
}

function PrintStat({ label, value }) {
  return (
    <div style={{
      padding: "14px 14px",
      borderRight: "1px solid #000", borderBottom: "1px solid #000",
    }}>
      <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 9, letterSpacing: ".14em", color: "#555", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono, 'Geist Mono'), monospace", fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function PrintProfile({ profile }) {
  const w = 500, h = 80;
  const padL = 26, padR = 6, padT = 6, padB = 18;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  const eles = profile.map(p => p.ele);
  const minE = Math.floor(Math.min(...eles) / 10) * 10;
  const maxE = Math.ceil((Math.max(...eles) + 5) / 10) * 10;
  const maxD = profile[profile.length-1].d;
  const xs = (d) => padL + (d / maxD) * innerW;
  const ys = (e) => padT + innerH - ((e - minE) / (maxE - minE)) * innerH;
  const linePath = "M " + profile.map(p => `${xs(p.d)},${ys(p.ele)}`).join(" L ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet">
      <path d={linePath + ` L ${xs(maxD)},${padT+innerH} L ${xs(0)},${padT+innerH} Z`} fill="#222"/>
      <path d={linePath} fill="none" stroke="#000" strokeWidth="1.4"/>
      <line x1={padL} x2={padL+innerW} y1={padT+innerH} y2={padT+innerH} stroke="#000"/>
      <text x={padL-3} y={padT+5} textAnchor="end" fontSize="9" fontFamily="var(--font-mono, 'Geist Mono'), monospace" fill="#555">{maxE}</text>
      <text x={padL-3} y={padT+innerH+3} textAnchor="end" fontSize="9" fontFamily="var(--font-mono, 'Geist Mono'), monospace" fill="#555">{minE}</text>
      <text x={padL} y={h-4} fontSize="9" fontFamily="var(--font-mono, 'Geist Mono'), monospace" fill="#555">0</text>
      <text x={padL+innerW} y={h-4} textAnchor="end" fontSize="9" fontFamily="var(--font-mono, 'Geist Mono'), monospace" fill="#555">{(maxD/1000).toFixed(2)} km</text>
    </svg>
  );
}

window.PrintableCard = PrintableCard;
