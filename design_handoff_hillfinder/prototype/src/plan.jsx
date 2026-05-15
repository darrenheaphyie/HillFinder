// Session planner — flip the user need: define the workout, get matching hills.
// Inputs: workout type, reps, rep duration, recovery, sport, target avg grade.
// Computes per-rep ascent and length budget from a rough VAM (vertical ascent
// per hour) heuristic, then matches hills.

const { useState: usePS, useMemo: useMP } = React;

// Vertical ascent rate (m/hr) by sport+effort.
const VAM = {
  run:  { easy: 600, moderate: 800, hard: 1000 },
  bike: { easy: 700, moderate: 900, hard: 1100 },
};

// Workout templates — quick presets.
const TEMPLATES = [
  { id: "short_reps", label: "Short reps",  reps: 6, repMin: 2,  restMin: 2, grade: 8, sport: "run",  effort: "hard" },
  { id: "vo2",        label: "VO2",         reps: 5, repMin: 4,  restMin: 3, grade: 7, sport: "run",  effort: "hard" },
  { id: "tempo",      label: "Tempo climb", reps: 3, repMin: 8,  restMin: 4, grade: 5, sport: "bike", effort: "moderate" },
  { id: "endurance",  label: "Long climb",  reps: 1, repMin: 25, restMin: 0, grade: 5, sport: "bike", effort: "moderate" },
];

function PlanView({ filters, hovered, setHovered, onOpen, session, setSession, openPrintCard }) {
  const vam = VAM[session.sport][session.effort];
  const repAscent  = Math.round(vam * (session.repMin / 60));            // m per rep
  const repLength  = Math.round((repAscent / session.grade) * 100);      // m horizontal per rep
  const totalClimb = session.reps * session.repMin;
  const totalAsc   = session.reps * repAscent;
  const totalMin   = session.reps * session.repMin + Math.max(0, session.reps - 1) * session.restMin;

  // Match heuristic: a hill is good if its length >= repLength AND avg grade
  // within ±2% of target. Then score by closeness to target length + grade.
  const matched = useMP(() => {
    const candidates = window.filterHills(HILLS, filters);
    const scored = candidates.map(h => {
      const lenDelta = Math.abs(h.lengthM - repLength) / repLength;
      const gradeDelta = Math.abs(h.avgGrade - session.grade) / session.grade;
      const fits = h.lengthM >= repLength * 0.7 && Math.abs(h.avgGrade - session.grade) <= 2.5;
      return { hill: h, lenDelta, gradeDelta, fits, score: lenDelta * 0.5 + gradeDelta * 0.5 };
    });
    return scored.sort((a, b) => (b.fits - a.fits) || (a.score - b.score)).slice(0, 6);
  }, [filters, repLength, session.grade]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", flex: 1, minHeight: 0 }}>
      {/* Planner form */}
      <aside style={{ borderRight: "1px solid var(--line)", background: "var(--bg-elev)", padding: "22px 22px", overflowY: "auto" }} className="scrollbar">
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 12 }}>
          DESIGN A SESSION
        </div>

        <div style={{ marginBottom: 22 }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em", marginBottom: 6 }}>QUICK START</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSession({ ...t })} style={{
                padding: "8px 10px", textAlign: "left",
                background: "transparent", border: "1px solid var(--line-2)",
                color: "var(--ink)", cursor: "pointer",
              }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{t.label}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>
                  {t.reps}×{t.repMin}min @ {t.grade}%
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SegRow label="SPORT" value={session.sport}
            onChange={v => setSession({ ...session, sport: v })}
            options={[{ value: "run", label: "Run" }, { value: "bike", label: "Bike" }]}/>
          <SegRow label="EFFORT" value={session.effort}
            onChange={v => setSession({ ...session, effort: v })}
            options={[{ value: "easy", label: "Easy" }, { value: "moderate", label: "Mod" }, { value: "hard", label: "Hard" }]}/>

          <NumRow label="REPS"            value={session.reps}     onChange={v => setSession({ ...session, reps: v })}     min={1}   max={20} step={1} unit=""/>
          <NumRow label="EACH"            value={session.repMin}   onChange={v => setSession({ ...session, repMin: v })}   min={1}   max={45} step={1} unit="min"/>
          <NumRow label="RECOVERY"        value={session.restMin}  onChange={v => setSession({ ...session, restMin: v })}  min={0}   max={15} step={1} unit="min"/>
          <NumRow label="TARGET GRADIENT" value={session.grade}    onChange={v => setSession({ ...session, grade: v })}    min={3}   max={15} step={0.5} unit="%"/>
        </div>

        {/* Computed budget */}
        <div style={{ marginTop: 22, padding: "14px 16px", border: "1px solid var(--line-2)", background: "var(--bg)" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 10 }}>PER-REP BUDGET</div>
          <BudgetLine label="Ascent / rep" value={`+${repAscent} m`}/>
          <BudgetLine label="Length / rep" value={repLength >= 1000 ? (repLength/1000).toFixed(2)+" km" : repLength+" m"}/>
          <div style={{ borderTop: "1px solid var(--line)", margin: "10px 0", paddingTop: 10 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 8 }}>SESSION TOTAL</div>
            <BudgetLine label="Climb time" value={totalClimb + " min"}/>
            <BudgetLine label="With recovery" value={totalMin + " min"}/>
            <BudgetLine label="Total ascent" value={"+" + totalAsc + " m"} accent/>
          </div>
        </div>
      </aside>

      {/* Matches */}
      <main style={{ overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }} className="scrollbar">
        <div style={{ padding: "22px 28px 8px" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em" }}>RECOMMENDED HILLS</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>
              {matched.filter(m => m.fits).length} fit · {matched.length - matched.filter(m => m.fits).length} close
            </h2>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
              Ranked by how close they match your rep length & gradient
            </span>
          </div>
        </div>

        <div style={{ padding: "12px 28px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {matched.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", marginBottom: 6 }}>NO HILLS MATCH</div>
              <div style={{ fontSize: 13 }}>Adjust your workout or loosen the filters.</div>
            </div>
          ) : matched.map(({ hill, fits, score }, i) => (
            <PlanMatchCard key={hill.id} hill={hill} fits={fits} session={session} repLength={repLength} repAscent={repAscent} rank={i+1}
              onHover={() => setHovered(hill.id)} onLeave={() => setHovered(null)}
              onOpen={() => onOpen(hill.id)} hovered={hovered}
              onPrint={() => openPrintCard && openPrintCard(hill)}/>
          ))}
        </div>
      </main>
    </div>
  );
}

function SegRow({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>{label}</span>
      <div style={{ display: "flex", border: "1px solid var(--line-2)" }}>
        {options.map(o => {
          const active = o.value === value;
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              style={{ flex: 1, padding: "6px 8px", fontSize: 12, fontWeight: 500,
                background: active ? "var(--ink)" : "transparent",
                color: active ? "var(--bg-elev)" : "var(--ink-2)", border: 0 }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

function NumRow({ label, value, onChange, min, max, step, unit }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>{label}</span>
        <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>{value}<span style={{ color: "var(--ink-3)", fontSize: 11, marginLeft: 3, fontWeight: 400 }}>{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}/>
    </div>
  );
}

function BudgetLine({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0" }}>
      <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{label}</span>
      <span className="mono" style={{ fontSize: accent ? 16 : 13, fontWeight: 500, color: accent ? "var(--accent)" : "var(--ink)" }}>{value}</span>
    </div>
  );
}

function PlanMatchCard({ hill, fits, session, repLength, repAscent, rank, onHover, onLeave, onOpen, hovered, onPrint }) {
  const lenMatch = hill.lengthM / repLength;
  const isHover = hovered === hill.id;
  // build a short reasoning blurb
  const blurbs = [];
  if (lenMatch >= 0.85 && lenMatch <= 1.15) blurbs.push("Length spot-on");
  else if (lenMatch < 0.85) blurbs.push(`${(lenMatch*100).toFixed(0)}% of target length — too short for full rep`);
  else if (lenMatch > 2) blurbs.push("Long enough for multiple reps without turning around");
  else blurbs.push(`${lenMatch.toFixed(1)}× target length`);

  const gradeDelta = hill.avgGrade - session.grade;
  if (Math.abs(gradeDelta) <= 1) blurbs.push("Gradient on target");
  else blurbs.push(`${gradeDelta > 0 ? "Steeper" : "Shallower"} than target by ${Math.abs(gradeDelta).toFixed(1)}%`);

  if (hill.distanceKm > 20) blurbs.push(`${hill.distanceKm.toFixed(0)} km drive — a commitment`);

  return (
    <div
      onMouseEnter={onHover} onMouseLeave={onLeave}
      style={{
        display: "grid", gridTemplateColumns: "auto 1fr auto",
        padding: "16px 18px", gap: 16, alignItems: "center",
        background: isHover ? "var(--bg-elev)" : "var(--bg)",
        border: "1px solid " + (isHover ? "var(--ink-4)" : "var(--line)"),
        position: "relative",
      }}>
      <div style={{ width: 48, textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: ".1em" }}>#{rank}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: fits ? "var(--green)" : "var(--yellow)" }}/>
          <span className="mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: ".06em" }}>
            {fits ? "FITS" : "CLOSE"}
          </span>
        </div>
      </div>
      <div style={{ minWidth: 0, cursor: "pointer" }} onClick={onOpen}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{hill.name}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          {(hill.lengthM/1000).toFixed(2)} km · <span style={{ color: window.gradeColorHex(hill.avgGrade) }}>{hill.avgGrade.toFixed(1)}%</span> avg ·
          {" "}+{hill.ascentM} m · {hill.distanceKm.toFixed(1)} km away
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-2)" }}>
          {blurbs.join(" · ")}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <window.Sparkline profile={hill.profile} color={window.gradeColorHex(hill.avgGrade)} width={120} height={40}/>
        {onPrint && (
          <button onClick={(e) => { e.stopPropagation(); onPrint(); }}
            style={{
              padding: "4px 8px", fontSize: 10, fontWeight: 500,
              background: "transparent", border: "1px solid var(--line-2)",
              color: "var(--ink-2)", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: ".06em",
            }} className="mono">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4V1.5h6V4M4 11h-2V5h10v6h-2M4 9h6v4H4z"/>
            </svg>
            PRINT CARD
          </button>
        )}
      </div>
    </div>
  );
}

window.PlanView = PlanView;
window.PLAN_TEMPLATES = TEMPLATES;
