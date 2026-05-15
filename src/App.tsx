import { useHashRoute } from "./lib/hash-route";
import { ResultsView } from "./components/results-view";
import { DetailView } from "./components/detail-view";

export function App() {
  const [route, navigate] = useHashRoute();

  return (
    <div className="h-full flex flex-col bg-bg">
      <header className="border-b border-line bg-bg-elev px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ kind: "results" })}
          className="font-serif text-xl text-ink"
        >
          HillFinder
        </button>
        <span className="text-xs text-ink-3 uppercase tracking-wide">Kilkenny · MVP</span>
      </header>
      <main className="flex-1 min-h-0">
        {route.kind === "results" ? (
          <ResultsView onSelectHill={(id) => navigate({ kind: "detail", id })} />
        ) : (
          <DetailView hillId={route.id} onBack={() => navigate({ kind: "results" })} />
        )}
      </main>
    </div>
  );
}
