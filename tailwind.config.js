/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Field Journal · Slate (light) palette — ported from the design handoff.
        bg: "#F5F7F9",
        "bg-elev": "#FFFFFF",
        ink: "#0B121C",
        "ink-2": "#3E4A5C",
        "ink-3": "#6E7889",
        "ink-4": "#AEB6C2",
        line: "#E3E7EC",
        "line-2": "#CFD5DC",
        paper: "#EDF0F3",
        accent: "#B85C38",
        "accent-2": "#93481C",
        water: "#B7CCD4",
        contour: "#C7CED6",
        // Gradient colour scale (used by map polylines and elevation profile).
        "grade-green": "#4A9D5F",
        "grade-lime": "#A8C242",
        "grade-yellow": "#E8B53C",
        "grade-orange": "#E8843B",
        "grade-red": "#C73E3E",
      },
      fontFamily: {
        ui: ['Geist', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        display: ['Geist', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
      },
    },
  },
  plugins: [],
};
