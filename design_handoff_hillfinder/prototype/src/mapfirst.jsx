// Map-first / cartographer mode — full-bleed map, filters in a floating chip,
// hovered hill info in a floating panel on the right.

const { useState: useStateM, useMemo: useMemoM } = React;

function MapFirstView({ filters, setFilters, hovered, setHovered, onOpen, defaultFilters }) {
  const [filterOpen, setFilterOpen] = useStateM(false);

  const filtered = useMemoM(() => {
    const f = window.filterHills(HILLS, filters);
    const sortFns = {
      closest: (a,b) => a.distanceKm - b.distanceKm,
      steepest:(a,b) => b.avgGrade - a.avgGrade,
      longest: (a,b) => b.lengthM - a.lengthM,
      ascent:  (a,b) => b.ascentM - a.ascentM,
    };
    return [...f].sort(sortFns[filters.sort] || sortFns.closest);
  }, [filters]);

  const h = hovered ? HILLS.find(x => x.id === hovered) : null;

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <window.TopoMap hills={filtered} hovered={hovered} setHovered={setHovered} selected={null} setSelected={onOpen}/>

        {/* Floating filter chip / panel */}
        <div style={{ position: "absolute", top: 16, left: 16, maxWidth: 280 }}>
          {!filterOpen ? (
            <button onClick={() => setFilterOpen(true)} style={{
              background: "var(--bg-elev)", border: "1px solid var(--line-2)",
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
              cursor: "pointer", color: "var(--ink)", fontSize: 13,
            }}>
              <window.Icon.Filter size={14}/>
              <span>{filtered.length} hills · {filters.radius} km</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: 4 }}>EXPAND</span>
            </button>
          ) : (
            <div style={{
              background: "var(--bg-elev)", border: "1px solid var(--line-2)",
              padding: "16px 16px", width: 260,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em" }}>FILTERS</span>
                <button onClick={() => setFilterOpen(false)} style={{ background: "transparent", border: 0, color: "var(--ink-3)", cursor: "pointer" }}>
                  <window.Icon.Close size={12}/>
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <window.FSingleRange label="RADIUS" unit="km" min={1} max={50}
                  value={filters.radius} onChange={v => setFilters(f => ({...f, radius: v}))}/>
                <window.FRange label="LENGTH" unit="m" min={200} max={5000} step={50}
                  value={filters.length} onChange={v => setFilters(f => ({...f, length: v}))}
                  format={v => v >= 1000 ? (v/1000).toFixed(1)+"k" : v}/>
                <window.FRange label="GRADIENT" unit="%" min={3} max={15} step={0.5}
                  value={filters.grade} onChange={v => setFilters(f => ({...f, grade: v}))}
                  format={v => v.toFixed(1)}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>SURFACE</span>
                  <window.FChips value={filters.surface}
                    onChange={v => setFilters(f => ({...f, surface: v}))}
                    options={[{ value: "either", label: "Any" }, { value: "paved", label: "Paved" }, { value: "unpaved", label: "Off" }]}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating count + sort top-right */}
        <div style={{ position: "absolute", top: 16, right: 16, background: "var(--bg-elev)", border: "1px solid var(--line-2)", padding: "8px 14px" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em" }}>RESULTS</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="mono" style={{ fontSize: 22, fontWeight: 500 }}>{filtered.length}</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>HILLS</span>
          </div>
        </div>
      </div>

      {/* Right rail showing hovered or top-list */}
      <aside style={{ width: 280, flex: "0 0 280px", borderLeft: "1px solid var(--line)", background: "var(--bg-elev)", overflowY: "auto" }} className="scrollbar">
        {h ? (
          <HoveredCard hill={h} onOpen={() => onOpen(h.id)}/>
        ) : (
          <div style={{ padding: "18px 18px" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 12 }}>
              HOVER A LINE OR PIN
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 1 }}>
              {filtered.slice(0, 12).map((x, i) => (
                <li key={x.id}
                  onMouseEnter={() => setHovered(x.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onOpen(x.id)}
                  style={{
                    padding: "8px 0",
                    cursor: "pointer",
                    display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center",
                    borderBottom: i < 11 ? "1px solid var(--line)" : "none",
                  }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
                  <span className="mono" style={{ fontSize: 11, color: window.gradeColorHex(x.avgGrade) }}>{x.avgGrade.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function HoveredCard({ hill, onOpen }) {
  return (
    <div style={{ padding: "20px 20px" }}>
      <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 6 }}>
        {hill.area.toUpperCase()} · {hill.distanceKm.toFixed(1)} KM
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{hill.name}</h3>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Stat2 label="LENGTH" value={(hill.lengthM/1000).toFixed(2) + " km"}/>
        <Stat2 label="ASCENT" value={hill.ascentM + " m"}/>
        <Stat2 label="AVG" value={hill.avgGrade.toFixed(1) + "%"} color={window.gradeColorHex(hill.avgGrade)}/>
        <Stat2 label="MAX" value={hill.maxGrade.toFixed(1) + "%"} color={window.gradeColorHex(hill.maxGrade)}/>
      </div>

      <div style={{ marginTop: 18 }}>
        <window.Sparkline profile={hill.profile} color={window.gradeColorHex(hill.avgGrade)} width={240} height={50}/>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, fontSize: 11, color: "var(--ink-3)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {hill.surface === "paved" ? <window.Icon.Paved size={12}/> : <window.Icon.Unpaved size={12}/>}
          {window.SURFACE_LABEL[hill.surface]}
        </span>
        {hill.stravaSegments.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <window.Icon.Strava size={12}/>
            {hill.stravaSegments.length} segment{hill.stravaSegments.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <button onClick={onOpen} style={{
        marginTop: 18, width: "100%", padding: "10px 14px",
        background: "var(--ink)", color: "var(--bg-elev)", border: 0,
        fontSize: 13, fontWeight: 500, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        Open detail <window.Icon.Chevron size={11} style={{ transform: "rotate(-90deg)" }}/>
      </button>
    </div>
  );
}

function Stat2({ label, value, color }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: ".1em" }}>{label}</div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 500, color: color || "var(--ink)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

window.MapFirstView = MapFirstView;
