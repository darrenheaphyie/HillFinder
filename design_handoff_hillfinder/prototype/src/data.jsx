// Hill data for County Kilkenny prototype.
// Each hill has a stylised path on a 1000x720 SVG coord space and a synthetic
// elevation profile (samples evenly across length). Gradient values drive both
// the elevation chart fill and the map polyline colouring.

const USER_POS = { x: 502, y: 372, label: "You are here", place: "Kilkenny city centre" };

// helper: generate elevation profile from a length, average gradient, max gradient
// and a "shape" function in [0..1] -> bias. Returns array of {d, ele, grade}
function buildProfile(lengthM, startEle, avgGrade, maxGrade, shape) {
  const steps = 36;
  const samples = [];
  // first compute raw shape (relative gradient at each point), then scale so avg==avgGrade
  const raw = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    raw.push(shape(t));
  }
  // normalise raw to mean ~ 1
  const rawMean = raw.reduce((a,b)=>a+b,0) / raw.length;
  // we want grades such that mean = avgGrade and max ~= maxGrade
  // scale raw -> grades with mean avgGrade, then clip to maxGrade
  let grades = raw.map(r => (r / rawMean) * avgGrade);
  const maxRaw = Math.max(...grades);
  if (maxRaw > maxGrade) {
    // squash top: pull max towards maxGrade while preserving mean approximately
    grades = grades.map(g => g > maxGrade ? maxGrade : g);
  }
  // integrate to get elevation
  let ele = startEle;
  for (let i = 0; i < steps; i++) {
    const dStart = (i / steps) * lengthM;
    const dEnd = ((i + 1) / steps) * lengthM;
    const seg = dEnd - dStart;
    const rise = (grades[i] / 100) * seg;
    samples.push({ d: dStart, ele, grade: grades[i] });
    ele += rise;
  }
  // tail sample
  samples.push({ d: lengthM, ele, grade: grades[grades.length-1] });
  return samples;
}

// Build a smooth polyline path through points (returns array of "x,y" strings)
function pts(arr) { return arr.map(([x,y]) => ({ x, y })); }

const HILLS = [
  {
    id: "brandon",
    name: "Brandon Hill, North Face",
    area: "Graiguenamanagh",
    distanceKm: 28.4,
    lengthM: 3200,
    avgGrade: 7.4,
    maxGrade: 13.1,
    ascentM: 237,
    startEle: 78,
    topEle: 315,
    surface: "paved",
    direction: "SE → NW (ascending NW)",
    stravaSegments: [
      { name: "Brandon Hill Main Climb",    distance: "3.1 km", grade: "7.5%" },
      { name: "Top half — steepest pinch",  distance: "1.4 km", grade: "9.8%" },
      { name: "Graig side approach",        distance: "0.9 km", grade: "4.2%" },
    ],
    path: pts([[820,640],[795,580],[765,520],[735,470],[700,430],[660,395],[615,360],[570,330],[530,300],[505,275]]),
    pin: { x: 530, y: 300 },
    shape: (t) => 0.5 + 1.2 * Math.sin(Math.PI * t) + 0.4 * t,
  },
  {
    id: "tullaroan",
    name: "Tullaroan Ridge",
    area: "Tullaroan",
    distanceKm: 18.1,
    lengthM: 1450,
    avgGrade: 6.1,
    maxGrade: 9.4,
    ascentM: 88,
    startEle: 142,
    topEle: 230,
    surface: "paved",
    direction: "W → E",
    stravaSegments: [
      { name: "Tullaroan Climb",         distance: "1.4 km", grade: "6.1%" },
      { name: "Ridge top sprint",        distance: "0.4 km", grade: "8.0%" },
    ],
    path: pts([[180,300],[225,290],[270,278],[315,262],[358,250],[400,242]]),
    pin: { x: 270, y: 278 },
    shape: (t) => 0.6 + Math.sin(Math.PI * t) * 1.0 + 0.3 * (1 - t),
  },
  {
    id: "deadmans",
    name: "Deadmans Lane",
    area: "Castlecomer",
    distanceKm: 22.7,
    lengthM: 980,
    avgGrade: 8.9,
    maxGrade: 14.2,
    ascentM: 87,
    startEle: 168,
    topEle: 255,
    surface: "paved",
    direction: "S → N",
    stravaSegments: [
      { name: "Deadmans Lane, full",     distance: "0.98 km", grade: "8.9%" },
      { name: "The Wall",                distance: "0.22 km", grade: "13.8%" },
      { name: "Castlecomer back road",   distance: "0.45 km", grade: "6.1%" },
    ],
    path: pts([[430,90],[440,120],[450,150],[465,180],[478,212],[490,245]]),
    pin: { x: 465, y: 180 },
    shape: (t) => 0.4 + 1.4 * Math.pow(Math.sin(Math.PI * t), 1.3) + 0.6 * t,
  },
  {
    id: "freshford",
    name: "Three Castles Climb",
    area: "Freshford",
    distanceKm: 12.3,
    lengthM: 2100,
    avgGrade: 4.6,
    maxGrade: 7.8,
    ascentM: 97,
    startEle: 95,
    topEle: 192,
    surface: "paved",
    direction: "NE → SW",
    stravaSegments: [
      { name: "Three Castles Drag", distance: "2.1 km", grade: "4.6%" },
    ],
    path: pts([[390,180],[365,205],[340,230],[315,250],[290,265],[265,278],[240,290]]),
    pin: { x: 315, y: 250 },
    shape: (t) => 0.7 + 0.8 * Math.sin(Math.PI * t) + 0.4 * Math.sin(2 * Math.PI * t),
  },
  {
    id: "inistioge",
    name: "Mount Alto via Woodstock",
    area: "Inistioge",
    distanceKm: 24.8,
    lengthM: 2780,
    avgGrade: 9.2,
    maxGrade: 16.5,
    ascentM: 256,
    startEle: 28,
    topEle: 284,
    surface: "unpaved",
    direction: "N → S",
    stravaSegments: [
      { name: "Woodstock Forest Climb",    distance: "2.8 km", grade: "9.2%" },
      { name: "Hairpin to summit",         distance: "0.6 km", grade: "13.4%" },
    ],
    path: pts([[810,470],[795,505],[778,540],[755,570],[728,595],[698,615],[665,625],[635,635]]),
    pin: { x: 728, y: 595 },
    shape: (t) => 0.4 + 1.6 * Math.pow(Math.sin(Math.PI * t), 0.8) + 0.5 * t,
  },
  {
    id: "bennetts",
    name: "Bennettsbridge South",
    area: "Bennettsbridge",
    distanceKm: 9.2,
    lengthM: 720,
    avgGrade: 5.4,
    maxGrade: 8.1,
    ascentM: 39,
    startEle: 52,
    topEle: 91,
    surface: "paved",
    direction: "N → S",
    stravaSegments: [
      { name: "Bennettsbridge pinch", distance: "0.7 km", grade: "5.4%" },
      { name: "Café sprint",          distance: "0.2 km", grade: "7.2%" },
    ],
    path: pts([[535,430],[548,455],[560,478],[570,500],[578,520]]),
    pin: { x: 560, y: 478 },
    shape: (t) => 0.6 + 0.9 * Math.sin(Math.PI * t),
  },
  {
    id: "mullinavat",
    name: "Mullinavat Boreen",
    area: "Mullinavat",
    distanceKm: 35.6,
    lengthM: 1640,
    avgGrade: 10.4,
    maxGrade: 17.2,
    ascentM: 171,
    startEle: 64,
    topEle: 235,
    surface: "unpaved",
    direction: "E → W",
    stravaSegments: [
      { name: "Mullinavat Boreen full",  distance: "1.6 km", grade: "10.4%" },
      { name: "Lower ramp",              distance: "0.5 km", grade: "8.3%" },
      { name: "Upper wall",              distance: "0.3 km", grade: "15.1%" },
      { name: "Boreen sprint",           distance: "0.15 km", grade: "12.0%" },
    ],
    path: pts([[850,690],[815,685],[780,680],[745,672],[710,660],[680,648]]),
    pin: { x: 745, y: 672 },
    shape: (t) => 0.3 + 1.4 * Math.sin(Math.PI * t) + 0.9 * t,
  },
  {
    id: "slieverue",
    name: "Slieverue Rise",
    area: "Slieverue",
    distanceKm: 38.2,
    lengthM: 1180,
    avgGrade: 5.8,
    maxGrade: 8.7,
    ascentM: 68,
    startEle: 48,
    topEle: 116,
    surface: "paved",
    direction: "W → E",
    stravaSegments: [
      { name: "Slieverue main", distance: "1.2 km", grade: "5.8%" },
    ],
    path: pts([[895,575],[905,560],[918,545],[930,532],[942,518]]),
    pin: { x: 918, y: 545 },
    shape: (t) => 0.7 + 0.7 * Math.sin(Math.PI * t) + 0.3 * (1 - t),
  },
  {
    id: "ballyhale",
    name: "Ballyhale Saddle",
    area: "Ballyhale",
    distanceKm: 19.7,
    lengthM: 2400,
    avgGrade: 3.6,
    maxGrade: 5.9,
    ascentM: 86,
    startEle: 71,
    topEle: 157,
    surface: "paved",
    direction: "N → S",
    stravaSegments: [],
    path: pts([[600,560],[615,580],[628,600],[642,620],[655,638],[670,654]]),
    pin: { x: 642, y: 620 },
    shape: (t) => 0.8 + 0.5 * Math.sin(Math.PI * t) + 0.2 * t,
  },
  {
    id: "kilmacow",
    name: "Kilmacow Loop, west side",
    area: "Kilmacow",
    distanceKm: 32.1,
    lengthM: 520,
    avgGrade: 11.8,
    maxGrade: 15.4,
    ascentM: 61,
    startEle: 38,
    topEle: 99,
    surface: "paved",
    direction: "S → N",
    stravaSegments: [
      { name: "Kilmacow Wall", distance: "0.52 km", grade: "11.8%" },
      { name: "Final 200m",    distance: "0.2 km", grade: "14.2%" },
    ],
    path: pts([[760,665],[758,650],[755,635],[752,620]]),
    pin: { x: 755, y: 635 },
    shape: (t) => 0.5 + 1.3 * Math.sin(Math.PI * t) + 0.6 * t,
  },
  {
    id: "thomastown",
    name: "Thomastown back road",
    area: "Thomastown",
    distanceKm: 17.4,
    lengthM: 1900,
    avgGrade: 4.2,
    maxGrade: 6.8,
    ascentM: 80,
    startEle: 55,
    topEle: 135,
    surface: "paved",
    direction: "NW → SE",
    stravaSegments: [
      { name: "Thomastown drag",  distance: "1.9 km", grade: "4.2%" },
      { name: "Top half",         distance: "0.9 km", grade: "5.4%" },
    ],
    path: pts([[650,470],[675,488],[700,505],[725,520],[750,532],[775,544]]),
    pin: { x: 725, y: 520 },
    shape: (t) => 0.7 + 0.7 * Math.sin(Math.PI * t),
  },
  {
    id: "kells",
    name: "Kells Priory Climb",
    area: "Kells",
    distanceKm: 13.6,
    lengthM: 1280,
    avgGrade: 6.8,
    maxGrade: 10.1,
    ascentM: 87,
    startEle: 82,
    topEle: 169,
    surface: "paved",
    direction: "E → W",
    stravaSegments: [
      { name: "Kells Priory ascent", distance: "1.3 km", grade: "6.8%" },
      { name: "Steep finish",        distance: "0.3 km", grade: "9.4%" },
    ],
    path: pts([[430,470],[412,478],[392,488],[372,498],[352,506]]),
    pin: { x: 392, y: 488 },
    shape: (t) => 0.6 + 1.0 * Math.sin(Math.PI * t) + 0.5 * t,
  },
];

// Pre-compute profiles
HILLS.forEach(h => { h.profile = buildProfile(h.lengthM, h.startEle, h.avgGrade, h.maxGrade, h.shape); });

// Surface label
const SURFACE_LABEL = { paved: "Paved", unpaved: "Unpaved" };

// Gradient colour bands (used by both map polylines and elevation profile)
function gradeColor(g) {
  if (g < 3) return "var(--green)";
  if (g < 6) return "var(--lime)";
  if (g < 9) return "var(--yellow)";
  if (g < 12) return "var(--orange)";
  return "var(--red)";
}
function gradeColorHex(g) {
  if (g < 3) return "#4A9D5F";
  if (g < 6) return "#A8C242";
  if (g < 9) return "#E8B53C";
  if (g < 12) return "#E8843B";
  return "#C73E3E";
}

// Apply the standard filters to the master list.
function filterHills(hills, f) {
  return hills.filter(h =>
    h.distanceKm <= f.radius &&
    h.lengthM >= f.length[0] && h.lengthM <= f.length[1] &&
    h.avgGrade >= f.grade[0] && h.avgGrade <= f.grade[1] &&
    h.ascentM >= f.ascent[0] && h.ascentM <= f.ascent[1] &&
    (f.surface === "either" || h.surface === f.surface)
  );
}

function sortHills(hills, key, dir = "auto") {
  const cmp = {
    name:       (a,b) => a.name.localeCompare(b.name),
    area:       (a,b) => a.area.localeCompare(b.area),
    distanceKm: (a,b) => a.distanceKm - b.distanceKm,
    lengthM:    (a,b) => a.lengthM - b.lengthM,
    avgGrade:   (a,b) => a.avgGrade - b.avgGrade,
    maxGrade:   (a,b) => a.maxGrade - b.maxGrade,
    ascentM:    (a,b) => a.ascentM - b.ascentM,
    surface:    (a,b) => a.surface.localeCompare(b.surface),
    segments:   (a,b) => a.stravaSegments.length - b.stravaSegments.length,
  }[key];
  if (!cmp) return hills;
  const sorted = [...hills].sort(cmp);
  return dir === "desc" ? sorted.reverse() : sorted;
}

// Default sort direction per column.
const DEFAULT_SORT_DIR = {
  name: "asc", area: "asc", distanceKm: "asc", surface: "asc",
  lengthM: "desc", avgGrade: "desc", maxGrade: "desc", ascentM: "desc", segments: "desc",
};

// Ambient context for a hill — direction, aspect heuristic, sunset.
// (Synthetic — for prototype demo only.)
function hillAmbient(hill) {
  // direction comes from path: end - start gives bearing.
  const a = hill.path[0], b = hill.path[hill.path.length-1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI; // 0=E, 90=S, -90=N
  const compass = ["E","SE","S","SW","W","NW","N","NE"];
  const idx = Math.round(((angle + 360) % 360) / 45) % 8;
  const facingFinish = compass[idx];
  // sunset by month — May Kilkenny is ~21:14
  const sunset = "21:14";
  // exposure heuristic: longer + higher = more exposed
  const exposure = hill.ascentM > 150 ? "Exposed ridgeline near summit"
                  : hill.lengthM > 1500 ? "Mixed cover, hedgerows"
                  : "Sheltered lanes";
  return { facingFinish, sunset, exposure };
}

Object.assign(window, { HILLS, USER_POS, gradeColor, gradeColorHex, SURFACE_LABEL,
  filterHills, sortHills, DEFAULT_SORT_DIR, hillAmbient });
