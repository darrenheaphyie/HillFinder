// Left filter rail — replaces the top filter strip. Vertical, narrow controls.
// Used by List / Grid / Compare modes. Plan mode swaps it for the planner;
// Map mode collapses it to a chip.

const { useState: useStateF } = React;

function FRange({ label, unit, value, onChange, min, max, step = 1, format }) {
  const [a, b] = value;
  const fmt = format || ((v) => v);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em", whiteSpace: "nowrap" }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap" }}>
          {fmt(a)}<span style={{ color: "var(--ink-4)" }}>–</span>{fmt(b)}<span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 16 }}>
        <div style={{ position: "absolute", top: 7, left: 0, right: 0, height: 2, background: "var(--line-2)" }}/>
        <div style={{ position: "absolute", top: 7, height: 2, background: "var(--ink)",
          left: `${((a-min)/(max-min))*100}%`, right: `${100 - ((b-min)/(max-min))*100}%` }}/>
        <input type="range" min={min} max={max} step={step} value={a}
          onChange={e => onChange([Math.min(+e.target.value, b - step), b])}
          style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}/>
        <input type="range" min={min} max={max} step={step} value={b}
          onChange={e => onChange([a, Math.max(+e.target.value, a + step)])}
          style={{ position: "absolute", inset: 0, pointerEvents: "auto", background: "transparent" }}/>
      </div>
    </div>
  );
}

function FSingleRange({ label, unit, value, onChange, min, max, step = 1 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em", whiteSpace: "nowrap" }}>{label}</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--ink)", fontWeight: 500, whiteSpace: "nowrap" }}>
          {value}<span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 2 }}>{unit}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)}/>
    </div>
  );
}

function FChips({ value, onChange, options }) {
  return (
    <div style={{ display: "flex", border: "1px solid var(--line-2)" }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              flex: 1, padding: "5px 6px", fontSize: 11, fontWeight: 500,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg-elev)" : "var(--ink-2)",
              border: 0, letterSpacing: ".02em",
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function FilterRail({ filters, setFilters, count, showSort = true, defaultFilters }) {
  const isDefault = defaultFilters && JSON.stringify(filters) === JSON.stringify(defaultFilters);
  return (
    <aside style={{
      width: 260, flex: "0 0 260px",
      borderRight: "1px solid var(--line)",
      background: "var(--bg-elev)",
      padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 18,
      overflowY: "auto",
    }} className="filter-rail">
      <div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".1em", marginBottom: 8 }}>
          FILTERS
        </div>
        {count != null && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{count}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: ".06em" }}>HILLS MATCH</span>
          </div>
        )}
      </div>

      <FSingleRange label="SEARCH RADIUS" unit="km" min={1} max={50}
        value={filters.radius} onChange={v => setFilters(f => ({...f, radius: v}))}/>
      <FRange label="HILL LENGTH" unit="m" min={200} max={5000} step={50}
        value={filters.length} onChange={v => setFilters(f => ({...f, length: v}))}
        format={v => v >= 1000 ? (v/1000).toFixed(1)+"k" : v}/>
      <FRange label="AVG GRADIENT" unit="%" min={3} max={15} step={0.5}
        value={filters.grade} onChange={v => setFilters(f => ({...f, grade: v}))}
        format={v => v.toFixed(1)}/>
      <FRange label="TOTAL ASCENT" unit="m" min={20} max={300} step={5}
        value={filters.ascent} onChange={v => setFilters(f => ({...f, ascent: v}))}/>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>SURFACE</span>
        <FChips value={filters.surface}
          onChange={v => setFilters(f => ({...f, surface: v}))}
          options={[
            { value: "either",  label: "Any" },
            { value: "paved",   label: "Paved" },
            { value: "unpaved", label: "Off" },
          ]}/>
      </div>

      {showSort && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: ".08em" }}>SORT BY</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {[
              { value: "closest", label: "Closest" },
              { value: "steepest", label: "Steepest" },
              { value: "longest", label: "Longest" },
              { value: "ascent", label: "Ascent" },
            ].map(o => {
              const active = filters.sort === o.value;
              return (
                <button key={o.value}
                  onClick={() => setFilters(f => ({...f, sort: o.value}))}
                  style={{
                    padding: "5px 8px", fontSize: 11, fontWeight: 500,
                    border: "1px solid " + (active ? "var(--ink)" : "var(--line-2)"),
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--bg-elev)" : "var(--ink-2)",
                  }}>{o.label}</button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}/>

      <button onClick={() => setFilters(defaultFilters)}
        disabled={isDefault}
        style={{
          padding: "6px 10px", fontSize: 11, color: isDefault ? "var(--ink-4)" : "var(--ink-2)",
          background: "transparent", border: "1px solid var(--line-2)",
          cursor: isDefault ? "default" : "pointer",
          letterSpacing: ".04em",
        }}
        className="mono">RESET FILTERS</button>
    </aside>
  );
}

window.FilterRail = FilterRail;
window.FRange = FRange; window.FSingleRange = FSingleRange; window.FChips = FChips;
