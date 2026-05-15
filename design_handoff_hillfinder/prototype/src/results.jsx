// Results screen orchestrator. Renders header + mode-specific body.
// Modes: list (cards + linked map) · grid · compare · plan · map.

const { useState: useStateR, useMemo: useMemoR } = React;

function ResultsView({
  view, setView,
  onOpen, hovered, setHovered,
  filters, setFilters, defaultFilters,
  dark, setDark,
  compareIds, setCompareIds,
  session, setSession,
  openPrintCard,
}) {
  // Filtered + sorted hills (used by List & map overlays). Grid/Compare/Plan
  // do their own filter+sort internally.
  const filteredList = useMemoR(() => {
    const f = window.filterHills(HILLS, filters);
    const sortFns = {
      closest:  (a,b) => a.distanceKm - b.distanceKm,
      steepest: (a,b) => b.avgGrade - a.avgGrade,
      longest:  (a,b) => b.lengthM - a.lengthM,
      ascent:   (a,b) => b.ascentM - a.ascentM,
    };
    return [...f].sort(sortFns[filters.sort] || sortFns.closest);
  }, [filters]);

  const allFiltered = useMemoR(() => window.filterHills(HILLS, filters), [filters]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", minHeight: 0 }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "14px 22px", borderBottom: "1px solid var(--line)", background: "var(--bg-elev)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo/>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>HillFinder</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em", marginTop: 2 }}>
              COUNTY KILKENNY · IE
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <window.ModeSwitcher value={view} onChange={setView}/>

        <div style={{ flex: 1 }}/>

        <button onClick={() => setDark(!dark)}
          style={{ background: "transparent", border: "1px solid var(--line-2)", padding: "6px 10px",
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
          {dark ? <Icon.Sun size={13}/> : <Icon.Moon size={13}/>}
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      {/* Mode-specific body */}
      {view === "list" && (
        <ListBody
          filtered={filteredList} hovered={hovered} setHovered={setHovered}
          onOpen={onOpen}
          filters={filters} setFilters={setFilters} defaultFilters={defaultFilters}
        />
      )}
      {view === "grid" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <window.FilterRail filters={filters} setFilters={setFilters} count={allFiltered.length} defaultFilters={defaultFilters} showSort={false}/>
          <window.GridView hills={HILLS} filters={filters}
            hovered={hovered} setHovered={setHovered}
            onOpen={onOpen}/>
        </div>
      )}
      {view === "compare" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <window.FilterRail filters={filters} setFilters={setFilters} count={allFiltered.length} defaultFilters={defaultFilters}/>
          <window.CompareView hills={HILLS} filters={filters}
            hovered={hovered} setHovered={setHovered}
            selected={compareIds} setSelected={setCompareIds}
            onOpen={onOpen}/>
        </div>
      )}
      {view === "plan" && (
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <window.PlanView filters={filters}
            hovered={hovered} setHovered={setHovered}
            onOpen={onOpen}
            session={session} setSession={setSession}
            openPrintCard={openPrintCard}/>
        </div>
      )}
      {view === "map" && (
        <window.MapFirstView filters={filters} setFilters={setFilters}
          hovered={hovered} setHovered={setHovered} onOpen={onOpen}
          defaultFilters={defaultFilters}/>
      )}

      <style>{`
        @media (max-width: 1100px) {
          .filter-rail { width: 200px !important; flex: 0 0 200px !important; }
        }
        @media (max-width: 880px) {
          .filter-rail { display: none; }
        }
      `}</style>
    </div>
  );
}

function ListBody({ filtered, hovered, setHovered, onOpen, filters, setFilters, defaultFilters }) {
  const [mobileTab, setMobileTab] = useStateR("list");
  return (
    <div className="list-body" style={{ flex: 1, display: "flex", minHeight: 0 }}>
      <window.FilterRail filters={filters} setFilters={setFilters} count={filtered.length} defaultFilters={defaultFilters}/>

      <aside className={"list-pane scrollbar " + (mobileTab === "map" ? "hide-mobile" : "")}
        style={{ width: 380, flex: "0 0 380px", borderRight: "1px solid var(--line)", overflowY: "auto", background: "var(--bg-elev)", minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)" }}>
            <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", marginBottom: 6 }}>NO MATCHES</div>
            <div style={{ fontSize: 13 }}>Loosen the filters to see more hills.</div>
          </div>
        ) : (
          <ul style={{ margin: 0, padding: 0 }}>
            {filtered.map((h, i) => (
              <HillCard key={h.id} hill={h} index={i}
                hovered={hovered} setHovered={setHovered}
                onOpen={onOpen}/>
            ))}
          </ul>
        )}
      </aside>

      <main className={"map-pane " + (mobileTab === "list" ? "hide-mobile" : "")}
        style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <TopoMap
          hills={filtered}
          hovered={hovered}
          setHovered={setHovered}
          selected={null}
          setSelected={onOpen}
        />
        {hovered && (() => {
          const h = HILLS.find(x => x.id === hovered);
          if (!h) return null;
          return (
            <div className="fadein" style={{
              position: "absolute", top: 16, left: 16, background: "var(--bg-elev)",
              border: "1px solid var(--line-2)", padding: "10px 14px", minWidth: 220,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{h.name}</span>
                <span className="mono" style={{ fontSize: 11, color: window.gradeColorHex(h.avgGrade) }}>{h.avgGrade.toFixed(1)}%</span>
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
                {(h.lengthM/1000).toFixed(2)} km · {h.ascentM} m ascent
              </div>
            </div>
          );
        })()}
      </main>

      <style>{`
        @media (max-width: 880px) {
          .list-body { display: block !important; }
          .list-pane.hide-mobile, .map-pane.hide-mobile { display: none; }
        }
      `}</style>
    </div>
  );
}

function HillCard({ hill, index, hovered, setHovered, onOpen }) {
  const isHover = hovered === hill.id;
  return (
    <li
      onMouseEnter={() => setHovered(hill.id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => onOpen(hill.id)}
      style={{
        listStyle: "none",
        padding: "16px 18px",
        borderBottom: "1px solid var(--line)",
        background: isHover ? "var(--bg)" : "transparent",
        cursor: "pointer",
        transition: "background .15s",
        position: "relative",
      }}>
      {isHover && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--accent)" }}/>}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500, flex: "0 0 auto" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--ink)", lineHeight: 1.25, flex: 1, minWidth: 0 }}>
          {hill.name}
        </span>
      </div>
      <div style={{ marginTop: 4, marginLeft: 22, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-3)", flexWrap: "wrap" }}>
        <span>{hill.area}</span>
        <span style={{ width: 3, height: 3, borderRadius: 3, background: "var(--ink-4)", flex: "0 0 auto" }}/>
        <span className="mono" style={{ whiteSpace: "nowrap" }}>{hill.distanceKm.toFixed(1)} km away</span>
      </div>

      <div style={{ marginTop: 12, marginLeft: 22, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
        <Stat label="LENGTH" value={hill.lengthM >= 1000 ? (hill.lengthM/1000).toFixed(2)+" km" : hill.lengthM+" m"}/>
        <Stat label="AVG GRADE" value={hill.avgGrade.toFixed(1) + "%"} color={window.gradeColorHex(hill.avgGrade)}/>
        <Stat label="ASCENT" value={hill.ascentM + " m"}/>
        <Sparkline profile={hill.profile} color={window.gradeColorHex(hill.avgGrade)} width={64} height={20}/>
      </div>

      <div style={{ marginTop: 12, marginLeft: 22, display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--ink-3)", flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ink-2)" }}>
          {hill.surface === "paved" ? <Icon.Paved size={12}/> : <Icon.Unpaved size={12}/>}
          <span className="mono" style={{ letterSpacing: ".05em" }}>{SURFACE_LABEL[hill.surface].toUpperCase()}</span>
        </span>
        {hill.stravaSegments.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon.Strava size={12}/>
            <span className="mono">{hill.stravaSegments.length} segment{hill.stravaSegments.length>1?"s":""}</span>
          </span>
        )}
        <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>
          <Icon.Chevron size={12} style={{ transform: "rotate(-90deg)" }}/>
        </span>
      </div>
    </li>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: ".08em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 500, color: color || "var(--ink)" }}>{value}</div>
    </div>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M3 21 L10 12 L14 17 L19 9 L25 17" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="22" cy="6" r="2.4" fill="var(--accent)"/>
    </svg>
  );
}

Object.assign(window, { ResultsView, Logo });
