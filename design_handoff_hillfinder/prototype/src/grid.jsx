// Data-grid mode: sortable spreadsheet of every metric for every hill.
// Pairs with a slim map at the bottom that highlights the hovered row.

const { useState: useStateG, useMemo: useMemoG } = React;

function ColHeader({ k, label, align = "left", sort, setSort, w }) {
  const active = sort.key === k;
  const dir = active ? sort.dir : null;
  const onClick = () => {
    if (active) {
      setSort({ key: k, dir: dir === "asc" ? "desc" : "asc" });
    } else {
      setSort({ key: k, dir: window.DEFAULT_SORT_DIR[k] });
    }
  };
  return (
    <button onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, justifyContent: align === "right" ? "flex-end" : "flex-start",
        padding: "10px 12px", width: w, minWidth: w,
        textAlign: align,
        background: "transparent", border: 0,
        borderRight: "1px solid var(--line)",
        fontSize: 10, fontWeight: 600,
        color: active ? "var(--ink)" : "var(--ink-3)",
        letterSpacing: ".1em", fontFamily: "var(--font-mono, 'Geist Mono'), monospace",
        cursor: "pointer", textTransform: "uppercase",
      }}>
      <span>{label}</span>
      <span style={{ opacity: active ? 1 : 0.25, fontSize: 9 }}>
        {dir === "asc" ? "▲" : dir === "desc" ? "▼" : "▲"}
      </span>
    </button>
  );
}

function GridView({ hills, filters, hovered, setHovered, onOpen }) {
  const [sort, setSort] = useStateG({ key: "distanceKm", dir: "asc" });

  const filtered = useMemoG(() => {
    const f = window.filterHills(hills, filters);
    return window.sortHills(f, sort.key, sort.dir);
  }, [hills, filters, sort]);

  // Column widths sum should fit nicely. 8 columns.
  const cols = [
    { k: "name",       label: "Hill",      w: 280, align: "left" },
    { k: "area",       label: "Area",      w: 120, align: "left" },
    { k: "distanceKm", label: "Dist km",   w: 90,  align: "right" },
    { k: "lengthM",    label: "Length",    w: 100, align: "right" },
    { k: "avgGrade",   label: "Avg %",     w: 80,  align: "right" },
    { k: "maxGrade",   label: "Max %",     w: 80,  align: "right" },
    { k: "ascentM",    label: "Ascent m",  w: 90,  align: "right" },
    { k: "surface",    label: "Surface",   w: 90,  align: "left" },
    { k: "segments",   label: "Seg.",      w: 60,  align: "right" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "auto" }} className="scrollbar">
        <div style={{ minWidth: 1000 }}>
          {/* Header row */}
          <div style={{
            display: "flex", alignItems: "stretch",
            borderBottom: "1px solid var(--line-2)",
            background: "var(--bg-elev)",
            position: "sticky", top: 0, zIndex: 2,
          }}>
            <div style={{ width: 40, minWidth: 40, borderRight: "1px solid var(--line)" }}/>
            {cols.map(c => <ColHeader key={c.k} {...c} sort={sort} setSort={setSort}/>)}
          </div>

          {/* Rows */}
          {filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
              <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", marginBottom: 6 }}>NO MATCHES</div>
              <div style={{ fontSize: 13 }}>Loosen the filters to populate the grid.</div>
            </div>
          ) : (
            filtered.map((h, i) => {
              const hover = hovered === h.id;
              return (
                <div key={h.id}
                  onMouseEnter={() => setHovered(h.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onOpen(h.id)}
                  style={{
                    display: "flex", alignItems: "center",
                    borderBottom: "1px solid var(--line)",
                    background: hover ? "var(--bg-elev)" : (i % 2 ? "var(--bg)" : "var(--bg-elev)"),
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "background .1s",
                    position: "relative",
                  }}>
                  {hover && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "var(--accent)" }}/>}
                  <div style={{ width: 40, minWidth: 40, padding: "0 12px", borderRight: "1px solid var(--line)", color: "var(--ink-3)", fontFamily: "var(--font-mono, Geist Mono), monospace", fontSize: 11 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <Cell w={cols[0].w}><span style={{ fontWeight: 500 }}>{h.name}</span></Cell>
                  <Cell w={cols[1].w} muted>{h.area}</Cell>
                  <Cell w={cols[2].w} right mono>{h.distanceKm.toFixed(1)}</Cell>
                  <Cell w={cols[3].w} right mono>{h.lengthM >= 1000 ? (h.lengthM/1000).toFixed(2)+" km" : h.lengthM+" m"}</Cell>
                  <Cell w={cols[4].w} right mono style={{ color: window.gradeColorHex(h.avgGrade), fontWeight: 500 }}>{h.avgGrade.toFixed(1)}</Cell>
                  <Cell w={cols[5].w} right mono style={{ color: window.gradeColorHex(h.maxGrade) }}>{h.maxGrade.toFixed(1)}</Cell>
                  <Cell w={cols[6].w} right mono>{h.ascentM}</Cell>
                  <Cell w={cols[7].w} muted>{window.SURFACE_LABEL[h.surface]}</Cell>
                  <Cell w={cols[8].w} right mono>{h.stravaSegments.length || "—"}</Cell>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom strip: map */}
      <div style={{ height: 240, borderTop: "1px solid var(--line)", flex: "0 0 240px" }}>
        <window.TopoMap hills={filtered} hovered={hovered} setHovered={setHovered} selected={null} setSelected={onOpen}/>
      </div>
    </div>
  );
}

function Cell({ w, children, right, muted, mono, style }) {
  return (
    <div style={{
      width: w, minWidth: w,
      padding: "9px 12px",
      borderRight: "1px solid var(--line)",
      textAlign: right ? "right" : "left",
      color: muted ? "var(--ink-3)" : "var(--ink)",
      fontFamily: mono ? "var(--font-mono, Geist Mono), monospace" : "inherit",
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      ...style,
    }}>{children}</div>
  );
}

window.GridView = GridView;
