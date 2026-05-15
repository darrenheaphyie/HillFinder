// Theme system. Three divergent aesthetics share the same data + layout
// scaffolding; CSS variables on <html> swap palette + fonts, and per-theme
// MapBackground components swap the map's terrain treatment.

const THEMES = {
  paper: {
    id: "paper",
    name: "Field Journal",
    blurb: "Topographic paper, terracotta ink",
    swatch: ["#F4F1EA", "#B85C38", "#1A1815"],
  },
  wayfinder: {
    id: "wayfinder",
    name: "Wayfinder",
    blurb: "Botanical-editorial, sage on cream",
    swatch: ["#EFE9D8", "#3E6B47", "#1B2718"],
  },
  race: {
    id: "race",
    name: "Race Engineering",
    blurb: "Hi-vis HUD, mono telemetry",
    swatch: ["#0A0B0A", "#C5FF3D", "#E7EBE0"],
  },
};

const ThemeCtx = React.createContext("paper");
window.useTheme = () => React.useContext(ThemeCtx);
window.ThemeCtx = ThemeCtx;
window.THEMES = THEMES;

function applyTheme(id) {
  const html = document.documentElement;
  html.classList.remove("theme-paper", "theme-wayfinder", "theme-race");
  html.classList.add("theme-" + id);
}
window.applyTheme = applyTheme;

// ============== MAP BACKGROUND VARIANTS ==============
// Each renders inside an SVG with viewBox 0 0 1000 720. The TopoMap component
// composes one of these underneath its hill polylines + pins.

function PaperBackground() {
  // (delegated to existing ContourLayer + River + Roads + Settlements via
  // TopoMap. Returns null so TopoMap renders defaults.)
  return null;
}

function WayfinderBackground() {
  // Painterly washes of green at varying opacity to suggest forest/farmland,
  // plus a single river. No grid. No roads. Quiet settlements as italic dots.
  return (
    <g>
      <defs>
        <filter id="wash" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="3"/>
          <feDisplacementMap in="SourceGraphic" scale="14"/>
          <feGaussianBlur stdDeviation="6"/>
        </filter>
        <radialGradient id="washA"><stop offset="0%" stopColor="#A7C29A" stopOpacity="0.55"/><stop offset="100%" stopColor="#A7C29A" stopOpacity="0"/></radialGradient>
        <radialGradient id="washB"><stop offset="0%" stopColor="#6B8E5A" stopOpacity="0.5"/><stop offset="100%" stopColor="#6B8E5A" stopOpacity="0"/></radialGradient>
        <radialGradient id="washC"><stop offset="0%" stopColor="#C9B47A" stopOpacity="0.5"/><stop offset="100%" stopColor="#C9B47A" stopOpacity="0"/></radialGradient>
        <radialGradient id="washD"><stop offset="0%" stopColor="#7BA189" stopOpacity="0.45"/><stop offset="100%" stopColor="#7BA189" stopOpacity="0"/></radialGradient>
      </defs>
      {/* warm cream base already from --paper bg */}
      <g filter="url(#wash)" opacity="0.95">
        <ellipse cx="240" cy="280" rx="220" ry="160" fill="url(#washB)"/>
        <ellipse cx="760" cy="600" rx="260" ry="170" fill="url(#washB)"/>
        <ellipse cx="560" cy="200" rx="180" ry="120" fill="url(#washA)"/>
        <ellipse cx="870" cy="300" rx="120" ry="90" fill="url(#washD)"/>
        <ellipse cx="380" cy="560" rx="160" ry="110" fill="url(#washC)"/>
        <ellipse cx="640" cy="430" rx="100" ry="80" fill="url(#washA)"/>
      </g>
      {/* river */}
      <path d="M -20 480 C 120 460, 220 510, 340 470 S 540 380, 640 420 S 820 520, 1020 500"
            fill="none" stroke="#8FB8AE" strokeWidth="5" opacity="0.85" strokeLinecap="round"/>
      <path d="M 340 470 C 360 530, 330 600, 380 660" fill="none" stroke="#8FB8AE" strokeWidth="2.5" opacity="0.7"/>
      <path d="M 640 420 C 680 360, 660 260, 690 200" fill="none" stroke="#8FB8AE" strokeWidth="2.5" opacity="0.7"/>
      {/* whisper roads */}
      <g stroke="var(--ink-4)" fill="none" opacity="0.35" strokeDasharray="1.5 3">
        <path d="M -20 350 C 200 340, 400 360, 502 372 S 800 360, 1020 380" strokeWidth="1"/>
        <path d="M 502 -20 C 480 100, 510 250, 502 372 S 540 600, 560 740" strokeWidth="1"/>
        <path d="M 60 -20 C 180 120, 280 240, 380 360 S 540 580, 700 740" strokeWidth="1"/>
        <path d="M 1020 60 C 880 200, 760 320, 660 460 S 460 700, 240 740" strokeWidth="1"/>
      </g>
      {/* settlements in italic serif */}
      {[
        { x: 502, y: 372, name: "Kilkenny", lg: true },
        { x: 270, y: 290, name: "Tullaroan" },
        { x: 458, y: 180, name: "Castlecomer" },
        { x: 360, y: 240, name: "Freshford" },
        { x: 555, y: 480, name: "Bennettsbridge" },
        { x: 720, y: 528, name: "Thomastown" },
        { x: 690, y: 620, name: "Inistioge" },
        { x: 820, y: 600, name: "Graiguenamanagh" },
        { x: 380, y: 488, name: "Kells" },
        { x: 640, y: 638, name: "Ballyhale" },
        { x: 740, y: 680, name: "Mullinavat" },
        { x: 920, y: 540, name: "Slieverue" },
      ].map((s, i) => (
        <g key={i}>
          <circle cx={s.x} cy={s.y} r={s.lg ? 4 : 2} fill="var(--ink)"/>
          <text x={s.x + 7} y={s.y + 4}
            fontStyle="italic"
            fontFamily="Instrument Serif, serif"
            fontSize={s.lg ? 17 : 13}
            fill="var(--ink-2)"
            style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 3 }}>{s.name}</text>
        </g>
      ))}
    </g>
  );
}

function RaceBackground() {
  // Tight dark grid, sharp roads in dim white, neon waypoints, monospace caps.
  return (
    <g>
      <defs>
        <pattern id="hudgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 L0 0 0 20" fill="none" stroke="var(--line)" strokeWidth="0.5" opacity="0.7"/>
        </pattern>
        <pattern id="hudgrid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0 L0 0 0 100" fill="none" stroke="var(--line-2)" strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="1000" height="720" fill="url(#hudgrid)"/>
      <rect x="0" y="0" width="1000" height="720" fill="url(#hudgrid-major)"/>
      {/* faux contour rings as cyan dashes */}
      {[
        { cx: 230, cy: 280, rx: 110, ry: 70 },
        { cx: 760, cy: 590, rx: 130, ry: 80 },
        { cx: 560, cy: 200, rx: 90,  ry: 60 },
        { cx: 880, cy: 320, rx: 65,  ry: 45 },
        { cx: 380, cy: 540, rx: 80,  ry: 55 },
      ].map((b, bi) => (
        <g key={bi}>
          {[0,1,2].map(i => {
            const rx = b.rx - i * 25, ry = b.ry - i * 16;
            if (rx < 10) return null;
            return (
              <ellipse key={i} cx={b.cx} cy={b.cy} rx={rx} ry={ry}
                fill="none" stroke="var(--ink-4)" strokeWidth="0.7" strokeDasharray="2 4" opacity={0.7 - i * 0.18}/>
            );
          })}
        </g>
      ))}
      {/* roads as cool grey thin lines */}
      <g stroke="var(--road)" fill="none">
        <path d="M -20 350 C 200 340, 400 360, 502 372 S 800 360, 1020 380" strokeWidth="2"/>
        <path d="M 502 -20 C 480 100, 510 250, 502 372 S 540 600, 560 740" strokeWidth="2"/>
        <path d="M -20 200 C 200 220, 360 280, 520 290 S 760 350, 1020 320" strokeWidth="1.3"/>
        <path d="M 60 -20 C 180 120, 280 240, 380 360 S 540 580, 700 740" strokeWidth="1.3"/>
        <path d="M 1020 60 C 880 200, 760 320, 660 460 S 460 700, 240 740" strokeWidth="1.3"/>
      </g>
      {/* river as cyan trace */}
      <path d="M -20 480 C 120 460, 220 510, 340 470 S 540 380, 640 420 S 820 520, 1020 500"
            fill="none" stroke="#3E7CA8" strokeWidth="1.3" opacity="0.7"/>
      {/* settlements as squares with mono caps */}
      {[
        { x: 502, y: 372, name: "KKNY",  lg: true },
        { x: 270, y: 290, name: "TLR" },
        { x: 458, y: 180, name: "CSC" },
        { x: 360, y: 240, name: "FSH" },
        { x: 555, y: 480, name: "BBR" },
        { x: 720, y: 528, name: "THM" },
        { x: 690, y: 620, name: "INI" },
        { x: 820, y: 600, name: "GRG" },
        { x: 380, y: 488, name: "KLS" },
        { x: 640, y: 638, name: "BLH" },
        { x: 740, y: 680, name: "MLN" },
        { x: 920, y: 540, name: "SLV" },
      ].map((s, i) => (
        <g key={i}>
          <rect x={s.x-3} y={s.y-3} width="6" height="6" fill="var(--ink-3)" stroke="var(--ink-2)" strokeWidth="0.6"/>
          {s.lg && <rect x={s.x-7} y={s.y-7} width="14" height="14" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.7"/>}
          <text x={s.x + 8} y={s.y + 3} fontFamily="JetBrains Mono, monospace"
            fontSize={s.lg ? 10 : 8} fill={s.lg ? "var(--accent)" : "var(--ink-3)"}
            letterSpacing="0.1em"
            style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 3 }}>{s.name}</text>
        </g>
      ))}
      {/* corner HUD reticles */}
      <g stroke="var(--accent)" fill="none" strokeWidth="1" opacity="0.7">
        <path d="M 10 10 L 10 28 M 10 10 L 28 10"/>
        <path d="M 990 10 L 990 28 M 990 10 L 972 10"/>
        <path d="M 10 710 L 10 692 M 10 710 L 28 710"/>
        <path d="M 990 710 L 990 692 M 990 710 L 972 710"/>
      </g>
    </g>
  );
}

window.PaperBackground = PaperBackground;
window.WayfinderBackground = WayfinderBackground;
window.RaceBackground = RaceBackground;

// ============== THEME SWITCHER ==============
function ThemeSwitcher({ value, onChange }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--line-2)", background: "var(--bg)" }}>
      {Object.values(THEMES).map(t => {
        const active = t.id === value;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            title={t.blurb}
            style={{
              padding: "5px 10px",
              fontSize: 11,
              fontWeight: 500,
              background: active ? "var(--ink)" : "transparent",
              color: active ? "var(--bg-elev)" : "var(--ink-2)",
              border: 0,
              display: "inline-flex", alignItems: "center", gap: 7,
            }}>
            <span style={{ display: "inline-flex", gap: 1 }}>
              {t.swatch.map((c, i) => <span key={i} style={{ width: 6, height: 10, background: c, display: "inline-block" }}/>)}
            </span>
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
window.ThemeSwitcher = ThemeSwitcher;
