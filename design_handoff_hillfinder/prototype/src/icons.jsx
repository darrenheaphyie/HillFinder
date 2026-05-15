// Inline SVG icons used across the app. Strokes pick up currentColor.
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
    </svg>
  ),
  Pin: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M8 14s5-4.5 5-8.5A5 5 0 003 5.5C3 9.5 8 14 8 14z"/><circle cx="8" cy="5.5" r="1.6" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Ruler: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="1.5" y="5" width="13" height="6" rx="0.5"/>
      <path d="M4 5v2M6 5v3M8 5v2M10 5v3M12 5v2"/>
    </svg>
  ),
  Grade: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 13L13 4M2 13h11"/>
    </svg>
  ),
  Ascent: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 12l4-6 3 4 5-7"/><path d="M11 3h3v3"/>
    </svg>
  ),
  Paved: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M4 2l-2 12M12 2l2 12M8 2v2M8 7v2M8 12v2"/>
    </svg>
  ),
  Unpaved: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M4 2l-2 12M12 2l2 12"/>
      <circle cx="6" cy="6" r=".7" fill="currentColor"/>
      <circle cx="10" cy="9" r=".7" fill="currentColor"/>
      <circle cx="7.5" cy="12" r=".7" fill="currentColor"/>
    </svg>
  ),
  Compass: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="8" cy="8" r="6"/><path d="M8 4l2 4-4 0z" fill="currentColor"/>
    </svg>
  ),
  Strava: (p) => (
    // generic "segment" mark — a chevron and bar; not a brand mark
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 11l3-6 3 6 2-3 2 4"/>
    </svg>
  ),
  External: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M9 3h4v4M13 3l-6 6M11 9v4H3V5h4"/>
    </svg>
  ),
  Back: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M10 3L5 8l5 5"/>
    </svg>
  ),
  Close: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M3 3l10 10M13 3L3 13"/>
    </svg>
  ),
  Sun: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="8" cy="8" r="3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/>
    </svg>
  ),
  Moon: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M13 9.5A6 6 0 016.5 3a6 6 0 107 6.5z"/>
    </svg>
  ),
  Map: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 4l4-2 4 2 4-2v10l-4 2-4-2-4 2zM6 2v12M10 4v12"/>
    </svg>
  ),
  List: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M3 4h10M3 8h10M3 12h10"/>
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||12} height={p.size||12} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M5 6l3 3 3-3"/>
    </svg>
  ),
  Filter: (p) => (
    <svg viewBox="0 0 16 16" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M2 3h12l-4.5 6V14L6.5 12V9z"/>
    </svg>
  ),
};
window.Icon = Icon;
