import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type HoverContextValue = {
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
};

const HoverContext = createContext<HoverContextValue | null>(null);

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const value = useMemo(() => ({ hoveredId, setHoveredId }), [hoveredId]);
  return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}

export function useHover(): HoverContextValue {
  const ctx = useContext(HoverContext);
  if (!ctx) throw new Error("useHover must be used inside <HoverProvider>");
  return ctx;
}
