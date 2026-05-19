import { formatCityLabel } from '../lib/filters';

type Props = {
  readonly cities: ReadonlyArray<string>;
  readonly value: string | null;
  readonly onChange: (city: string | null) => void;
};

function Row({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-border-subtle last:border-b-0 ${
        selected ? 'text-accent-brand font-medium' : 'text-text-primary'
      }`}
    >
      <span>{label}</span>
      {selected && <span aria-hidden>✓</span>}
    </button>
  );
}

export function CityPicker({ cities, value, onChange }: Props) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden max-h-56 overflow-y-auto">
      <Row label="כל הערים" selected={value === null} onClick={() => onChange(null)} />
      {cities.map((c) => (
        <Row key={c} label={formatCityLabel(c)} selected={value === c} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}
