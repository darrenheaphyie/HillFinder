// Hill detail view v2. Adds:
//  - reverse-direction toggle (mirrors the profile + recolours A/B)
//  - ambient strip: facing, sunset, exposure heuristic
//  - back-link preserves filter state

const { useState: useStateD, useMemo: useMemoD } = React;

function DetailStat({ label, value, sub, accent }) {
  return (
    <div style={{ padding: "14px 16px", borderRight: "1px solid var(--line)", minWidth: 0 }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: ".12em", marginBottom: 6 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 500, color: accent || "var(--ink)", lineHeight: 1, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function GradeBreakdown({ profile }) {
  const bands = [
    { lo: 0,  hi: 3,  c: "#4A9D5F", l: "0–3%" },
    { lo: 3,  hi: 6,  c: "#A8C242", l: "3–6%" },
    { lo: 6,  hi: 9,  c: "#E8B53C", l: "6–9%" },
    { lo: 9,  hi: 12, c: "#E8843B", l: "9–12%" },
    { lo: 12, hi: 99, c: "#C73E3E", l: "12%+" },
  ];
  let totalLen = 0;
  const lens = bands.map(()=>0);
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i], b = profile[i+1];
    const segLen = b.d - a.d;
    const g = (a.grade + b.grade) / 2;
    const bi = bands.findIndex(x => g >= x.lo && g < x.hi);
    if (bi >= 0) lens[bi] += segLen;
    totalLen += segLen;
  }
  const pcts = lens.map(l => l / totalLen);
  return (
    <div>
      <div style={{ display: "flex", height: 8, border: "1px solid var(--line-2)" }}>
        {pcts.map((p, i) => p > 0 ? (
          <div key={i} style={{ flex: p, background: bands[i].c }} title={`${bands[i].l} · ${Math.round(p*100)}%`}/>
        ) : null)}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
        {bands.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, background: b.c, display: "inline-block" }}/>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-2)" }}>
              {b.l} <span style={{ color: "var(--ink-4)" }}>{Math.round(pcts[i]*100)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reverse a hill: flip path direction + invert profile so x goes 0→len but
// elevation is "as if climbed the other way" (i.e. start from the top).
// Net effect: a descent if reversed. We model reversed as climbing from the
// other end; ascent = original descent. For the prototype we just mirror.
function reverseHill(hill) {
  const pts = [...hill.path].reverse();
  const maxD = hill.profile[hill.profile.length - 1].d;
  const profile = hill.profile.map((p, i, arr) => {
    const j = arr.length - 1 - i;
    const orig = arr[j];
    return { d: maxD - orig.d, ele: orig.ele, grade: orig.grade };
  }).sort((a,b)=>a.d-b.d);
  // approximate new ascent = max - min on reversed profile, same number
  return {
    ...hill,
    path: pts,
    profile,
    startEle: Math.round(profile[0].ele),
    topEle: Math.round(profile[profile.length-1].ele),
    ascentM: Math.abs(Math.round(profile[profile.length-1].ele - profile[0].ele)),
    direction: hill.direction.split("→").reverse().join("→").replace(/\(ascending [A-Z]+\)/, ""),
    _reversed: true,
  };
}

function DetailView({ hill: hillIn, onBack, prevHill, nextHill, onNav, dark, setDark }) {
  const [hoverFrac, setHoverFrac] = useStateD(null);
  const [reversed, setReversed] = useStateD(false);

  const hill = useMemoD(() => reversed ? reverseHill(hillIn) : hillIn, [hillIn, reversed]);

  const ambient = useMemoD(() => window.hillAmbient(hill), [hill]);

  const mapMarker = useMemoD(() => {
    if (hoverFrac == null) return null;
    const pts = hill.path;
    const t = hoverFrac * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(t));
    const local = t - i;
    return {
      x: pts[i].x + (pts[i+1].x - pts[i].x) * local,
      y: pts[i].y + (pts[i+1].y - pts[i].y) * local,
    };
  }, [hoverFrac, hill]);

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Breadcrumb / header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 22px",
        borderBottom: "1px solid var(--line)", background: "var(--bg-elev)",
      }}>
        <button onClick={onBack} style={{
          background: "transparent", border: "1px solid var(--line-2)",
          padding: "6px 10px", display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--ink-2)", whiteSpace: "nowrap",
        }}>
          <Icon.Back size={12}/> Back to results
        </button>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", letterSpacing: ".08em" }}>
          KILKENNY <span style={{ margin: "0 6px" }}>/</span> HILLS <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--ink-2)" }}>{hillIn.id.toUpperCase()}</span>
        </span>

        <span style={{ flex: 1 }}/>

        {/* Prev / next */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--line-2)" }}>
          <button onClick={() => prevHill && onNav(prevHill.id)} disabled={!prevHill}
            title={prevHill ? "Previous · ←" : "First in list"}
            style={{
              padding: "6px 10px", background: "transparent", border: 0,
              borderRight: "1px solid var(--line-2)",
              color: prevHill ? "var(--ink-2)" : "var(--ink-4)",
              cursor: prevHill ? "pointer" : "default",
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
              minWidth: 0, maxWidth: 200,
            }}>
            <Icon.Back size={12}/>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {prevHill ? prevHill.name : "—"}
            </span>
          </button>
          <button onClick={() => nextHill && onNav(nextHill.id)} disabled={!nextHill}
            title={nextHill ? "Next · →" : "Last in list"}
            style={{
              padding: "6px 10px", background: "transparent", border: 0,
              color: nextHill ? "var(--ink-2)" : "var(--ink-4)",
              cursor: nextHill ? "pointer" : "default",
              display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
              minWidth: 0, maxWidth: 200,
            }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nextHill ? nextHill.name : "—"}
            </span>
            <Icon.Back size={12} style={{ transform: "rotate(180deg)" }}/>
          </button>
        </div>

        <button onClick={() => setDark && setDark(!dark)}
          style={{ background: "transparent", border: "1px solid var(--line-2)", padding: "6px 10px",
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
          {dark ? <Icon.Sun size={13}/> : <Icon.Moon size={13}/>}
        </button>
      </header>

      {/* Title block */}
      <div style={{ padding: "26px 32px 18px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, flex: "1 1 320px" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 6 }}>
              {hill.area.toUpperCase()} · {hill.distanceKm.toFixed(1)} KM FROM YOU
            </div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.1, textWrap: "balance" }}>
              {hill.name}
            </h1>
            <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-3)", flexWrap: "wrap", rowGap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                {hill.surface === "paved" ? <Icon.Paved size={12}/> : <Icon.Unpaved size={12}/>}
                {SURFACE_LABEL[hill.surface]}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: 3, background: "var(--ink-4)" }}/>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                <Icon.Compass size={12}/> {hillIn.direction}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: 3, background: "var(--ink-4)" }}/>
              <span className="mono" style={{ whiteSpace: "nowrap" }}>52.6°N · 7.2°W</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setReversed(!reversed)}
              style={{
                background: reversed ? "var(--ink)" : "transparent",
                color: reversed ? "var(--bg-elev)" : "var(--ink-2)",
                border: "1px solid " + (reversed ? "var(--ink)" : "var(--line-2)"),
                padding: "10px 14px", fontSize: 12, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
              }} title="Run the descent as the climb">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 7h10M2 7l3-3M2 7l3 3M12 4v6"/>
              </svg>
              {reversed ? "Reversed direction" : "Reverse"}
            </button>
            <button style={{
              background: "var(--ink)", color: "var(--bg-elev)", border: 0,
              padding: "10px 16px", fontSize: 13, fontWeight: 500,
              display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
            }}>
              <Icon.Pin size={13}/> Get directions
              <Icon.External size={11}/>
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
        borderBottom: "1px solid var(--line)", background: "var(--bg-elev)",
      }}>
        <DetailStat label="LENGTH" value={(hill.lengthM/1000).toFixed(2) + " km"} sub={hill.lengthM + " m"}/>
        <DetailStat label="TOTAL ASCENT" value={hill.ascentM + " m"} sub={`+${hill.ascentM}m over ${(hill.lengthM/1000).toFixed(1)}km`}/>
        <DetailStat label="AVG GRADIENT" value={hill.avgGrade.toFixed(1) + "%"} accent={window.gradeColorHex(hill.avgGrade)}/>
        <DetailStat label="MAX GRADIENT" value={hill.maxGrade.toFixed(1) + "%"} accent={window.gradeColorHex(hill.maxGrade)}/>
        <DetailStat label="START ELEV" value={hill.startEle + " m"}/>
        <DetailStat label="TOP ELEV" value={hill.topEle + " m"} sub={`Δ ${hill.topEle - hill.startEle} m`}/>
      </div>

      {/* Ambient strip */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 0,
        background: "var(--bg)", borderBottom: "1px solid var(--line)",
      }}>
        <AmbientCell label="FACING AT TOP"  value={ambient.facingFinish}  sub="Compass bearing of the finish"/>
        <AmbientCell label="SUN SETS"        value={ambient.sunset}        sub="Tonight · plan to descend before"/>
        <AmbientCell label="EXPOSURE"        value={ambient.exposure}      sub="Wind / weather context"/>
        <AmbientCell label="BEST TIME"
          value={hill.avgGrade > 9 ? "Hill reps" : hill.lengthM > 2500 ? "Sustained climb" : "Tempo"}
          sub="From its shape"/>
      </div>

      {/* Map + side rail (Strava) */}
      <div className="detail-split" style={{
        display: "grid", gridTemplateColumns: "1fr 320px", gap: 0,
        borderBottom: "1px solid var(--line)",
      }}>
        <div style={{ position: "relative", height: 360, borderRight: "1px solid var(--line)" }}>
          <TopoMap hills={[]} single={hill} showLegend={true}/>
          {mapMarker && (
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <MapMarker hill={hill} marker={mapMarker}/>
            </div>
          )}
          <div style={{
            position: "absolute", top: 12, left: 12, background: "var(--bg-elev)",
            border: "1px solid var(--line-2)", padding: "6px 10px",
            display: "flex", alignItems: "center", gap: 8, fontSize: 11,
          }}>
            <span className="mono" style={{ color: "var(--ink-3)", letterSpacing: ".06em" }}>DIRECTION</span>
            <span style={{ fontWeight: 500 }}>{hill.direction}</span>
            {reversed && (
              <span className="mono" style={{ marginLeft: 4, padding: "1px 5px", background: "var(--ink)", color: "var(--bg-elev)", fontSize: 9, letterSpacing: ".08em" }}>REV</span>
            )}
          </div>
        </div>

        <aside style={{ background: "var(--bg-elev)", padding: "18px 20px" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 10 }}>
            STRAVA SEGMENTS
          </div>
          {hill.stravaSegments.length === 0 ? (
            <div style={{ padding: "20px 0", color: "var(--ink-3)", fontSize: 13, lineHeight: 1.5 }}>
              No Strava segments on this hill.
              <div style={{ marginTop: 6, color: "var(--ink-2)" }}>You might be the first.</div>
              <button style={{
                marginTop: 14, background: "transparent", border: "1px solid var(--line-2)",
                padding: "6px 10px", fontSize: 12, color: "var(--ink-2)",
              }}>
                Open in Strava <Icon.External size={11} style={{ marginLeft: 4 }}/>
              </button>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {hill.stravaSegments.map((s, i) => (
                <li key={i} style={{ padding: "10px 0", borderBottom: i < hill.stravaSegments.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.name}</span>
                    <a href="#" onClick={e => e.preventDefault()} style={{ color: "var(--ink-3)", flex: "0 0 auto" }} title="Open in Strava">
                      <Icon.External size={12}/>
                    </a>
                  </div>
                  <div className="mono" style={{ marginTop: 3, fontSize: 11, color: "var(--ink-3)" }}>
                    {s.distance} <span style={{ color: "var(--ink-4)" }}>·</span> avg {" "}
                    <span style={{ color: window.gradeColorHex(parseFloat(s.grade)) }}>{s.grade}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {/* Elevation profile */}
      <section style={{ padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Elevation profile</h2>
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
            Hover the chart to inspect <span style={{ color: "var(--ink-4)" }}>·</span> colour = gradient at that point
          </span>
        </div>
        <ElevationProfile profile={hill.profile} height={240} hoverFrac={hoverFrac} onHover={setHoverFrac}/>
      </section>

      {/* Gradient breakdown */}
      <section style={{ padding: "0 32px 28px" }}>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 8 }}>
          TIME-IN-GRADIENT
        </div>
        <GradeBreakdown profile={hill.profile}/>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .detail-split { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function AmbientCell({ label, value, sub }) {
  return (
    <div style={{ flex: "1 1 240px", padding: "14px 22px", borderRight: "1px solid var(--line)" }}>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: ".12em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{value}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function MapMarker({ hill, marker }) {
  const pts = hill.path;
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const minX = Math.min(...xs) - 80, maxX = Math.max(...xs) + 80;
  const minY = Math.min(...ys) - 70, maxY = Math.max(...ys) + 70;
  const w = maxX - minX, h = maxY - minY;
  const aspect = 1.5;
  const targetW = Math.max(w, h * aspect);
  const padX = (targetW - w) / 2;
  const vx = minX - padX, vy = minY, vw = targetW, vh = h;
  const left = ((marker.x - vx) / vw) * 100;
  const top  = ((marker.y - vy) / vh) * 100;
  return (
    <div style={{
      position: "absolute", left: `${left}%`, top: `${top}%`,
      transform: "translate(-50%, -50%)",
      width: 18, height: 18, borderRadius: "50%",
      background: "var(--accent)", border: "3px solid var(--bg-elev)",
    }}/>
  );
}

window.DetailView = DetailView;
