import { useState } from 'react';
import type { Filters } from '../lib/filters';

type Props = {
  readonly filters: Filters;
  readonly cuisineOptions: ReadonlyArray<string>;
  readonly onChange: (next: Filters) => void;
};

const PRICE_OPTIONS = [1, 2, 3, 4] as const;
const RATING_OPTIONS = [7, 8, 9] as const;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-accent-brand text-black border-accent-brand' : 'bg-bg-card text-text-secondary border-border-subtle hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({ filters, cuisineOptions, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (filters.openOnly ? 0 : 1) + // open-only is "default on", show count only when toggled off
    filters.cuisines.length +
    filters.priceRanges.length +
    (filters.minRating != null ? 1 : 0);

  function toggleCuisine(c: string) {
    const next = filters.cuisines.includes(c) ? filters.cuisines.filter((x) => x !== c) : [...filters.cuisines, c];
    onChange({ ...filters, cuisines: next });
  }
  function togglePrice(p: number) {
    const next = filters.priceRanges.includes(p) ? filters.priceRanges.filter((x) => x !== p) : [...filters.priceRanges, p];
    onChange({ ...filters, priceRanges: next });
  }
  function setRating(r: number) {
    onChange({ ...filters, minRating: filters.minRating === r ? null : r });
  }

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        <Chip active={!filters.openOnly} onClick={() => onChange({ ...filters, openOnly: !filters.openOnly })}>
          {filters.openOnly ? 'רק פתוחות' : 'כולל סגורות'}
        </Chip>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-border-subtle bg-bg-card text-text-secondary hover:text-text-primary"
        >
          סינון{activeCount > 0 ? ` (${activeCount})` : ''} {expanded ? '▲' : '▼'}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => onChange({ ...filters, cuisines: [], priceRanges: [], minRating: null })}
            className="shrink-0 text-xs text-text-muted hover:text-accent-danger"
          >
            נקה
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 bg-bg-card border border-border-subtle rounded-xl p-3">
          {cuisineOptions.length > 0 && (
            <div>
              <div className="text-[11px] text-text-muted mb-1.5">סוג מטבח</div>
              <div className="flex flex-wrap gap-2">
                {cuisineOptions.map((c) => (
                  <Chip key={c} active={filters.cuisines.includes(c)} onClick={() => toggleCuisine(c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[11px] text-text-muted mb-1.5">טווח מחירים</div>
            <div className="flex gap-2">
              {PRICE_OPTIONS.map((p) => (
                <Chip key={p} active={filters.priceRanges.includes(p)} onClick={() => togglePrice(p)}>
                  {'₪'.repeat(p)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-text-muted mb-1.5">דירוג מינימלי</div>
            <div className="flex gap-2">
              {RATING_OPTIONS.map((r) => (
                <Chip key={r} active={filters.minRating === r} onClick={() => setRating(r)}>
                  ★ {r}+
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
