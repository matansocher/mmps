type Props = {
  readonly value: string;
  readonly onChange: (v: string) => void;
};

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="חפש מסעדה (באנגלית)"
        dir="ltr"
        className="w-full bg-bg-card border border-border-subtle rounded-2xl px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-brand"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-lg leading-none"
          aria-label="clear"
        >
          ×
        </button>
      )}
    </div>
  );
}
