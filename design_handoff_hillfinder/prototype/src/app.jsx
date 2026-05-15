// HillFinder main app.
//
// Owns: filters, view, screen, dark mode (with sun-sweep transition),
// compare selection, planner session, URL state sync, and prev/next.

const { useState: useS, useEffect: useE, useMemo: useM, useRef: useR } = React;

const DEFAULT_FILTERS = {
  radius: 25,
  length: [200, 5000],
  grade: [3, 15],
  ascent: [20, 300],
  surface: "either",
  sort: "closest",
};

const DEFAULT_SESSION = {
  reps: 5, repMin: 4, restMin: 3, grade: 7, sport: "run", effort: "hard",
};

// ----- URL state helpers (hash params) -----
function parseHash() {
  const h = (window.location.hash || "").replace(/^#/, "");
  if (!h) return {};
  return Object.fromEntries(new URLSearchParams(h));
}
function writeHash(state) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v != null && v !== "") params.set(k, v);
  const newHash = params.toString() ? "#" + params.toString() : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", window.location.pathname + window.location.search + newHash);
  }
}

function App() {
  const initialHash = parseHash();
  const initialDefaults = window.TWEAK_DEFAULTS || {};

  const [screen, setScreen] = useS(initialHash.screen || initialDefaults.screen || "results");
  const [view, setView]     = useS(initialHash.view   || initialDefaults.view   || "list");
  const [selectedId, setSelectedId] = useS(initialHash.hill || "brandon");
  const [hovered, setHovered]       = useS(null);
  const [filters, setFilters]       = useS(DEFAULT_FILTERS);
  const [compareIds, setCompareIds] = useS([]);
  const [session, setSession]       = useS(DEFAULT_SESSION);
  const [printOpen, setPrintOpen]   = useS(false);
  const [printHill, setPrintHill]   = useS(null);

  // Dark mode + sun-sweep transition state.
  const [dark, _setDark] = useS(!!initialDefaults.dark);
  const [sweepActive, setSweepActive] = useS(false);
  const sweepingRef = useR(false);
  const sweepRef = useR(null);
  const skyRef = useR(null);
  const discRef = useR(null);

  const theme = initialDefaults.theme || "paper";
  const palette = initialDefaults.palette || "slate";

  // Apply theme + palette classes (once — themes are not user-toggleable now).
  useE(() => { window.applyTheme(theme); }, [theme]);
  useE(() => {
    const html = document.documentElement;
    html.classList.remove("pal-slate", "pal-bone", "pal-graphite");
    if (theme === "paper") html.classList.add("pal-" + palette);
  }, [palette, theme]);

  // Apply dark class.
  useE(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Lock scroll on results screens (they're 100vh); detail flows.
  useE(() => {
    document.body.classList.toggle("lock-scroll", screen === "results");
    if (screen === "detail") window.scrollTo({ top: 0, behavior: "instant" });
  }, [screen]);

  // ----- URL state: write on change -----
  useE(() => {
    writeHash({
      view: view !== "list" ? view : null,
      hill: screen === "detail" ? selectedId : null,
      screen: screen !== "results" ? screen : null,
    });
  }, [view, screen, selectedId]);

  // ----- URL state: respond to back/forward -----
  useE(() => {
    const onHashChange = () => {
      const h = parseHash();
      if (h.view && h.view !== view) setView(h.view);
      if (h.screen && h.screen !== screen) setScreen(h.screen);
      if (!h.screen && screen !== "results") setScreen("results");
      if (h.hill && h.hill !== selectedId) setSelectedId(h.hill);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [view, screen, selectedId]);

  // Persist palette/screen/view to the host so a refresh restores state.
  useE(() => { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { view, screen, dark } }, "*"); }, [view, screen, dark]);

  // ----- Sun-sweep dark toggle (Web Animations API) -----
  // Each keyframe holds (vw, vh) — parabolic path: slow at top of sky,
  // accelerating as the sun nears the horizon.
  const SET_FRAMES = [
    { transform: "translate(95vw, 12vh)", offset: 0 },
    { transform: "translate(72vw, 22vh)", offset: 0.30 },
    { transform: "translate(50vw, 42vh)", offset: 0.55 },
    { transform: "translate(28vw, 72vh)", offset: 0.78 },
    { transform: "translate(14vw, 96vh)", offset: 0.92 },
    { transform: "translate( 6vw,118vh)", offset: 1 },
  ];
  const RISE_FRAMES = [
    { transform: "translate( 6vw,118vh)", offset: 0 },
    { transform: "translate(14vw, 96vh)", offset: 0.08 },
    { transform: "translate(28vw, 72vh)", offset: 0.22 },
    { transform: "translate(50vw, 42vh)", offset: 0.45 },
    { transform: "translate(72vw, 22vh)", offset: 0.70 },
    { transform: "translate(95vw, 12vh)", offset: 1 },
  ];

  const toggleDark = () => {
    if (sweepingRef.current) return;
    sweepingRef.current = true;
    const goingDark = !dark;
    setSweepActive({ phase: goingDark ? "set" : "rise", goingDark, t: Date.now() });
    document.documentElement.classList.add("transitioning");
  };

  // Drive the WAAPI animation as a React effect — guarantees DOM is mounted
  // and the .sun-sweep.active className has been applied before we reach
  // for .sun-sky / .sun-disc.
  useE(() => {
    if (!sweepActive) return;
    const frames = sweepActive.phase === "set" ? SET_FRAMES : RISE_FRAMES;
    const sky  = document.querySelector(".sun-sky");
    const disc = document.querySelector(".sun-disc");
    const opts = { duration: 2400, easing: "cubic-bezier(0.45, 0.05, 0.55, 1)", fill: "forwards" };
    if (sky)  { sky.style.transform  = frames[0].transform; sky.animate(frames,  opts); }
    if (disc) { disc.style.transform = frames[0].transform; disc.animate(frames, opts); }

    const flipT  = setTimeout(() => { _setDark(sweepActive.goingDark); }, 1450);
    const endT   = setTimeout(() => {
      setSweepActive(null);
      document.documentElement.classList.remove("transitioning");
      sweepingRef.current = false;
    }, 2500);
    return () => { clearTimeout(flipT); clearTimeout(endT); };
  }, [sweepActive]);

  // ----- Detail prev/next from the currently-filtered list. -----
  const filteredList = useM(() => {
    const f = window.filterHills(HILLS, filters);
    const sortFns = {
      closest:  (a,b) => a.distanceKm - b.distanceKm,
      steepest: (a,b) => b.avgGrade - a.avgGrade,
      longest:  (a,b) => b.lengthM - a.lengthM,
      ascent:   (a,b) => b.ascentM - a.ascentM,
    };
    return [...f].sort(sortFns[filters.sort] || sortFns.closest);
  }, [filters]);

  // If the currently-selected hill isn't in the filtered list (e.g. opened
  // from a different mode), fall back to the full sorted list so navigation
  // still works.
  const navList = useM(() => {
    if (filteredList.some(h => h.id === selectedId)) return filteredList;
    return [...HILLS].sort((a,b) => a.distanceKm - b.distanceKm);
  }, [filteredList, selectedId]);

  const navIdx = navList.findIndex(h => h.id === selectedId);
  const prevHill = navIdx > 0 ? navList[navIdx - 1] : null;
  const nextHill = navIdx >= 0 && navIdx < navList.length - 1 ? navList[navIdx + 1] : null;

  // Arrow keys on detail to navigate.
  useE(() => {
    if (screen !== "detail") return;
    const onKey = (e) => {
      if (e.key === "ArrowLeft"  && prevHill) { setSelectedId(prevHill.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
      if (e.key === "ArrowRight" && nextHill) { setSelectedId(nextHill.id); window.scrollTo({ top: 0, behavior: "smooth" }); }
      if (e.key === "Escape") setScreen("results");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, prevHill, nextHill]);

  const onOpenDetail = (id) => {
    setSelectedId(id);
    setScreen("detail");
    setHovered(null);
    window.scrollTo({ top: 0 });
  };
  const onBack = () => setScreen("results");

  const openPrintCardFor = (h) => { setPrintHill(h); setPrintOpen(true); };

  const hill = HILLS.find(h => h.id === selectedId) || HILLS[0];

  return (
    <window.ThemeCtx.Provider value={theme}>
    <div data-screen-label={screen === "results" ? "01 Results" : "02 Detail"}
         style={screen === "results"
           ? { height: "100vh", width: "100vw", display: "flex", flexDirection: "column" }
           : { minHeight: "100vh", width: "100%" }}>
      {screen === "results"
        ? <ResultsView
            view={view} setView={setView}
            onOpen={onOpenDetail}
            hovered={hovered} setHovered={setHovered}
            filters={filters} setFilters={setFilters} defaultFilters={DEFAULT_FILTERS}
            dark={dark} setDark={toggleDark}
            compareIds={compareIds} setCompareIds={setCompareIds}
            session={session} setSession={setSession}
            openPrintCard={openPrintCardFor}/>
        : <DetailView hill={hill} onBack={onBack}
            prevHill={prevHill} nextHill={nextHill}
            onNav={(id) => { setSelectedId(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            dark={dark} setDark={toggleDark}/>}

      <PrintableCard
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        session={session}
        hill={printHill}
        repAscent={Math.round(window.VAM_SAFE(session) * (session.repMin / 60))}
        repLength={Math.round((window.VAM_SAFE(session) * (session.repMin / 60) / session.grade) * 100)}
      />

      {/* Sun-sweep overlay */}
      <div ref={sweepRef} className={"sun-sweep " + (sweepActive ? "active" : "")} aria-hidden="true">
        <div ref={skyRef}  className="sun-sky"/>
        <div ref={discRef} className="sun-disc"/>
      </div>
    </div>
    </window.ThemeCtx.Provider>
  );
}

// VAM table from plan.jsx — duplicated here for the print card calculation.
window.VAM_SAFE = (s) => {
  const tbl = { run: { easy: 600, moderate: 800, hard: 1000 },
                bike:{ easy: 700, moderate: 900, hard: 1100 } };
  return (tbl[s.sport] && tbl[s.sport][s.effort]) || 800;
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
