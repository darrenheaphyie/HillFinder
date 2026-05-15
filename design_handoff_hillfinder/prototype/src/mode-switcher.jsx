// View-mode switcher in the header — LIST · GRID · COMPARE · PLAN · MAP.

const MODES = [
  { id: "list",    label: "List",    blurb: "Cards + linked map" },
  { id: "grid",    label: "Grid",    blurb: "Sortable spreadsheet of all metrics" },
  { id: "compare", label: "Compare", blurb: "Side-by-side stats for up to 3 hills" },
  { id: "plan",    label: "Plan",    blurb: "Pick a workout, get matching hills" },
  { id: "map",     label: "Map",     blurb: "Full-bleed cartographer view" },
];

function ModeSwitcher({ value, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      border: "1px solid var(--line-2)",
      background: "var(--bg-elev)",
    }}>
      {MODES.map((m, i) => {
        const active = m.id === value;
        return (
          <button key={m.id}
            onClick={() => onChange(m.id)}
            title={m.blurb}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: ".02em",
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg-elev)" : "var(--ink-2)",
              border: 0,
              borderLeft: i === 0 ? 0 : "1px solid var(--line-2)",
            }}>{m.label}</button>
        );
      })}
    </div>
  );
}

window.ModeSwitcher = ModeSwitcher;
window.MODES = MODES;
