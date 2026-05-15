import { TOWNS } from "../lib/towns";

type TownSelectorProps = {
  value: string;
  onChange: (id: string) => void;
};

export function TownSelector({ value, onChange }: TownSelectorProps) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-ink-2">
      <span className="text-xs uppercase tracking-wide text-ink-3">Distance from</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-elev border border-line rounded-md px-2 py-1 text-ink font-medium hover:border-line-2 focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {TOWNS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}
