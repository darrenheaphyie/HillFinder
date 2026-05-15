import { useEffect } from "react";
import { useHashRoute } from "./lib/hash-route";
import { ResultsView } from "./components/results-view";
import { DetailView } from "./components/detail-view";
import { HoverProvider } from "./lib/hover-context";

export function App() {
  const [route, navigate] = useHashRoute();

  useEffect(() => {
    document.title =
      route.kind === "detail" ? `HillFinder · climb` : `HillFinder · Kilkenny`;
  }, [route]);

  return (
    <HoverProvider>
      <AppShell route={route} navigate={navigate} />
    </HoverProvider>
  );
}

function AppShell({
  route,
  navigate,
}: {
  route: ReturnType<typeof useHashRoute>[0];
  navigate: ReturnType<typeof useHashRoute>[1];
}) {
  return (
    <div className="h-full flex flex-col bg-bg">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="border-b border-line bg-bg-elev px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: "results" })}
          className="font-serif text-xl text-ink"
          aria-label="HillFinder home"
        >
          HillFinder
        </button>
        <span className="text-xs text-ink-3 uppercase tracking-wide" aria-label="Region and phase">
          Kilkenny · MVP
        </span>
      </header>
      <main id="main" className="flex-1 min-h-0">
        {route.kind === "results" ? (
          <ResultsView onSelectHill={(id) => navigate({ kind: "detail", id })} />
        ) : (
          <DetailView hillId={route.id} onBack={() => navigate({ kind: "results" })} />
        )}
      </main>
    </div>
  );
}
