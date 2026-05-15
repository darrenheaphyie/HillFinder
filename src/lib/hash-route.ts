import { useEffect, useState, useCallback } from "react";

export type Route =
  | { kind: "results" }
  | { kind: "detail"; id: string };

function parseHash(): { route: Route; params: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, "");
  const [path, query] = raw.split("?");
  const params = new URLSearchParams(query ?? "");
  const match = /^\/hill\/([^/?]+)/.exec(path ?? "");
  const route: Route = match ? { kind: "detail", id: match[1] } : { kind: "results" };
  return { route, params };
}

function buildHash(route: Route, params: URLSearchParams): string {
  const path = route.kind === "detail" ? `/hill/${route.id}` : "";
  const qs = params.toString();
  if (!path && !qs) return "";
  return `#${path}${qs ? `?${qs}` : ""}`;
}

export function useHashRoute(): [Route, (next: Route) => void] {
  const [parsed, setParsed] = useState(() => parseHash());

  useEffect(() => {
    const onChange = () => setParsed(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const current = parseHash();
    const hash = buildHash(next, current.params);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    }
  }, []);

  return [parsed.route, navigate];
}

/**
 * Read/write a single URL-hash query parameter. Other params are preserved.
 */
export function useHashParam(key: string): [string | null, (value: string | null) => void] {
  const [value, setValue] = useState<string | null>(() => parseHash().params.get(key));

  useEffect(() => {
    const onChange = () => setValue(parseHash().params.get(key));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [key]);

  const set = useCallback(
    (next: string | null) => {
      const { route, params } = parseHash();
      if (next === null) params.delete(key);
      else params.set(key, next);
      const hash = buildHash(route, params);
      if (window.location.hash !== hash) {
        if (hash === "") {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        } else {
          window.location.hash = hash;
        }
      }
    },
    [key],
  );

  return [value, set];
}
