import { useEffect, useState } from "react";

export type Route =
  | { kind: "results" }
  | { kind: "detail"; id: string };

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return { kind: "results" };
  const match = /^\/hill\/([^/?]+)/.exec(raw);
  if (match) return { kind: "detail", id: match[1] };
  return { kind: "results" };
}

export function useHashRoute(): [Route, (next: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = (next: Route) => {
    const hash = next.kind === "detail" ? `#/hill/${next.id}` : "";
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  };

  return [route, navigate];
}
