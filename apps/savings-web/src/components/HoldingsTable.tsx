import { useMemo, useState } from 'react';
import { effectiveGeography } from '../lib/breakdown';
import { formatIls, formatPercent } from '../lib/format';
import type { BreakdownRecord, Holding } from '../types';
import { GEOGRAPHY_LABELS } from '../types';
import { EditIcon } from './Icons';
import { Select } from './Select';

type SortKey = 'name' | 'currentAmountIls' | 'share' | 'account' | 'currencyExposure' | 'assetType' | 'geography' | 'note';
type SortDirection = 'ascending' | 'descending';

type HoldingsTableProps = {
  readonly holdings: readonly Holding[];
  readonly editable: boolean;
  readonly onAmountChange: (id: string, nextAmountIls: number) => void;
  readonly onRowClick: (holding: Holding) => void;
};

const SORT_LABELS: Readonly<Record<SortKey, string>> = {
  name: 'השקעה',
  currentAmountIls: 'שווי נוכחי',
  share: 'מהתיק',
  account: 'חלק בתיק',
  currencyExposure: 'מטבע',
  assetType: 'סוג נכס',
  geography: 'אזור',
  note: 'הערה',
};

function numericValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

const OWNER_LABEL: Readonly<Record<Holding['owner'], string>> = {
  guy: 'גוז',
  tody: 'תודי',
  shared: 'משותף',
};

const CURRENCY_BADGE_LABEL: Readonly<Record<string, string>> = { fx: 'מט״ח', ils: 'שקלי' };
const ASSET_BADGE_LABEL: Readonly<Record<string, string>> = { equity: 'מנייתי', solid: 'סולידי' };

function BreakdownBadges({ breakdown, labels, badgeClass }: { readonly breakdown: BreakdownRecord; readonly labels: Readonly<Record<string, string>>; readonly badgeClass?: string }) {
  return (
    <span className="breakdown-badges">
      {Object.entries(breakdown)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([key, value]) => (
          <span key={key} className={`badge badge-compact${badgeClass ? ` ${badgeClass}` : ''}`}>
            {labels[key] ?? key} {value}%
          </span>
        ))}
    </span>
  );
}

type FilterChipProps = {
  readonly label: string;
  readonly active: boolean;
  readonly className?: string;
  readonly onClick: () => void;
};

function FilterChip({ label, active, className, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      className={`filter-chip${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

type FilterState = {
  readonly owner: Set<Holding['owner']>;
  readonly account: Set<Holding['account']>;
  readonly currency: Set<Holding['currencyExposure']>;
  readonly asset: Set<Holding['assetType']>;
  readonly geography: Set<string>;
};

function emptyFilters(): FilterState {
  return { owner: new Set(), account: new Set(), currency: new Set(), asset: new Set(), geography: new Set() };
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function hasActiveFilters(filters: FilterState): boolean {
  return filters.owner.size > 0 || filters.account.size > 0 || filters.currency.size > 0 || filters.asset.size > 0 || filters.geography.size > 0;
}

function holdingGeographies(holding: Holding): readonly string[] {
  return [...effectiveGeography(holding).keys()];
}

function matchesFilters(holding: Holding, filters: FilterState): boolean {
  if (filters.owner.size > 0 && !filters.owner.has(holding.owner)) return false;
  if (filters.account.size > 0 && !filters.account.has(holding.account)) return false;
  if (filters.currency.size > 0 && !filters.currency.has(holding.currencyExposure)) return false;
  if (filters.asset.size > 0 && !filters.asset.has(holding.assetType)) return false;
  if (filters.geography.size > 0 && !holdingGeographies(holding).some((geo) => filters.geography.has(geo))) return false;
  return true;
}

function compareHoldings(first: Holding, second: Holding, sortKey: SortKey, total: number): number {
  if (sortKey === 'currentAmountIls') return first.currentAmountIls - second.currentAmountIls;
  if (sortKey === 'share') return total > 0 ? first.currentAmountIls / total - second.currentAmountIls / total : 0;

  const firstValue = first[sortKey];
  const secondValue = second[sortKey];
  return String(firstValue).localeCompare(String(secondValue), 'he', {
    sensitivity: 'base',
    numeric: true,
  });
}

export function HoldingsTable({ holdings, editable, onAmountChange, onRowClick }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const total = holdings.reduce((sum, holding) => sum + numericValue(holding.currentAmountIls), 0);

  const filteredHoldings = useMemo(() => {
    if (!hasActiveFilters(filters)) return holdings;
    return holdings.filter((holding) => matchesFilters(holding, filters));
  }, [holdings, filters]);

  const sortedHoldings = useMemo(() => {
    const direction = sortDirection === 'ascending' ? 1 : -1;
    return [...filteredHoldings].sort((first, second) => {
      const comparison = compareHoldings(first, second, sortKey, total);
      return comparison === 0 ? first.name.localeCompare(second.name, 'he') : comparison * direction;
    });
  }, [filteredHoldings, sortDirection, sortKey, total]);

  const activeGeographies = useMemo(() => {
    const set = new Set<string>();
    for (const h of holdings) {
      for (const geo of holdingGeographies(h)) set.add(geo);
    }
    return [...set].sort((a, b) => {
      const ai = (GEOGRAPHY_LABELS as readonly string[]).indexOf(a);
      const bi = (GEOGRAPHY_LABELS as readonly string[]).indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [holdings]);

  function changeSort(nextKey: SortKey): void {
    if (nextKey === sortKey) {
      setSortDirection((current) => (current === 'ascending' ? 'descending' : 'ascending'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('ascending');
  }

  function sortableHeader(key: SortKey, className?: string) {
    const active = sortKey === key;
    return (
      <th className={className} aria-sort={active ? sortDirection : 'none'}>
        <button className="table-sort-button" type="button" onClick={() => changeSort(key)}>
          {SORT_LABELS[key]}
          <span className={`sort-indicator${active ? ' is-active' : ''}`} aria-hidden="true">
            {active && sortDirection === 'descending' ? '↓' : '↑'}
          </span>
        </button>
      </th>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="investments-empty">
        <strong>התיק עדיין ריק</strong>
        <span>הוסיפו את ההשקעה הראשונה כדי להתחיל לראות את תמונת התיק.</span>
      </div>
    );
  }

  const isFiltered = hasActiveFilters(filters);

  return (
    <div className="investments-table-wrap">
      <div className="table-filters">
        <div className="filter-group">
          <span className="filter-group-label">בעלים</span>
          <FilterChip label="גוז" active={filters.owner.has('guy')} className="filter-chip-guy" onClick={() => setFilters((f) => ({ ...f, owner: toggleInSet(f.owner, 'guy') }))} />
          <FilterChip label="תודי" active={filters.owner.has('tody')} className="filter-chip-tody" onClick={() => setFilters((f) => ({ ...f, owner: toggleInSet(f.owner, 'tody') }))} />
          <FilterChip label="משותף" active={filters.owner.has('shared')} onClick={() => setFilters((f) => ({ ...f, owner: toggleInSet(f.owner, 'shared') }))} />
        </div>
        <span className="filter-divider" />
        <div className="filter-group">
          <span className="filter-group-label">תיק</span>
          <FilterChip label="ידני" active={filters.account.has('manual')} onClick={() => setFilters((f) => ({ ...f, account: toggleInSet(f.account, 'manual') }))} />
          <FilterChip label="מנוהל" active={filters.account.has('managed')} onClick={() => setFilters((f) => ({ ...f, account: toggleInSet(f.account, 'managed') }))} />
        </div>
        <span className="filter-divider" />
        <div className="filter-group">
          <span className="filter-group-label">מטבע</span>
          <FilterChip label="מט״ח" active={filters.currency.has('fx')} onClick={() => setFilters((f) => ({ ...f, currency: toggleInSet(f.currency, 'fx') }))} />
          <FilterChip label="שקלי" active={filters.currency.has('ils')} onClick={() => setFilters((f) => ({ ...f, currency: toggleInSet(f.currency, 'ils') }))} />
        </div>
        <span className="filter-divider" />
        <div className="filter-group">
          <span className="filter-group-label">נכס</span>
          <FilterChip label="מנייתי" active={filters.asset.has('equity')} onClick={() => setFilters((f) => ({ ...f, asset: toggleInSet(f.asset, 'equity') }))} />
          <FilterChip label="סולידי" active={filters.asset.has('solid')} onClick={() => setFilters((f) => ({ ...f, asset: toggleInSet(f.asset, 'solid') }))} />
        </div>
        {activeGeographies.length > 0 ? (
          <>
            <span className="filter-divider" />
            <div className="filter-group">
              <span className="filter-group-label">אזור</span>
              {activeGeographies.map((geo) => (
                <FilterChip key={geo} label={geo} active={filters.geography.has(geo)} onClick={() => setFilters((f) => ({ ...f, geography: toggleInSet(f.geography, geo) }))} />
              ))}
            </div>
          </>
        ) : null}
        {isFiltered ? (
          <button type="button" className="filter-clear" onClick={() => setFilters(emptyFilters)}>
            נקה הכל
          </button>
        ) : null}
      </div>
      <div className="mobile-sort-controls">
        <label htmlFor="holdings-sort">מיון לפי</label>
        <Select
          id="holdings-sort"
          value={sortKey}
          onChange={(nextValue) => changeSort(nextValue as SortKey)}
          options={Object.entries(SORT_LABELS).map(([key, label]) => ({ value: key, label }))}
          ariaLabel="מיון לפי"
        />
        <button type="button" onClick={() => setSortDirection((current) => (current === 'ascending' ? 'descending' : 'ascending'))}>
          {sortDirection === 'ascending' ? 'סדר עולה' : 'סדר יורד'}
        </button>
      </div>
      <table className="investments-table">
        <thead>
          <tr>
            {sortableHeader('name')}
            {sortableHeader('currentAmountIls', 'number')}
            {sortableHeader('share', 'number')}
            {sortableHeader('account')}
            {sortableHeader('currencyExposure')}
            {sortableHeader('assetType')}
            {sortableHeader('geography')}
            {sortableHeader('note')}
            <th>
              <span className="sr-only">עריכה</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedHoldings.map((holding) => (
            <tr
              key={holding.id}
              className="row-clickable"
              tabIndex={0}
              onClick={() => onRowClick(holding)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(holding);
                }
              }}
              aria-label={`עריכת ${holding.name || 'ההשקעה'}`}
            >
              <td data-label="השקעה">
                <strong className="readonly-primary cell-ellipsis" title={holding.name || 'ללא שם'}>
                  {holding.name || 'ללא שם'}
                  <span className={`owner-label owner-label-${holding.owner ?? 'shared'}`} title={OWNER_LABEL[holding.owner ?? 'shared']}>
                    {OWNER_LABEL[holding.owner ?? 'shared']}
                  </span>
                </strong>
              </td>
              <td className="number" data-label="שווי נוכחי">
                {editable ? (
                  <div className="input-with-unit table-money-input" onClick={(event) => event.stopPropagation()}>
                    <input
                      name={`holding-current-amount-${holding.id}`}
                      type="number"
                      min="0"
                      step="100"
                      value={numericValue(holding.currentAmountIls)}
                      onChange={(event) => onAmountChange(holding.id, numericValue(event.target.valueAsNumber))}
                      aria-label={`שווי נוכחי עבור ${holding.name || 'ההשקעה'}`}
                    />
                    <span>₪</span>
                  </div>
                ) : (
                  <strong className="readonly-number">{formatIls(numericValue(holding.currentAmountIls))}</strong>
                )}
              </td>
              <td className="number investment-share" data-label="מהתיק">
                <strong>{formatPercent(total > 0 ? (holding.currentAmountIls / total) * 100 : 0)}</strong>
              </td>
              <td data-label="חלק בתיק">
                <span className="badge badge-account">{holding.account === 'managed' ? 'מנוהל' : 'ידני'}</span>
              </td>
              <td data-label="מטבע">
                {holding.currencyBreakdown ? (
                  <BreakdownBadges breakdown={holding.currencyBreakdown} labels={CURRENCY_BADGE_LABEL} />
                ) : (
                  <span className={`badge badge-currency-${holding.currencyExposure}`}>{holding.currencyExposure === 'fx' ? 'מט״ח' : 'שקלי'}</span>
                )}
              </td>
              <td data-label="סוג נכס">
                {holding.assetBreakdown ? (
                  <BreakdownBadges breakdown={holding.assetBreakdown} labels={ASSET_BADGE_LABEL} />
                ) : (
                  <span className={`badge badge-asset-${holding.assetType}`}>{holding.assetType === 'solid' ? 'סולידי' : 'מנייתי'}</span>
                )}
              </td>
              <td data-label="אזור">
                {holding.geographyBreakdown ? (
                  <BreakdownBadges breakdown={holding.geographyBreakdown} labels={Object.fromEntries(Object.keys(holding.geographyBreakdown).map((k) => [k, k]))} />
                ) : (
                  <span className="badge badge-geo">{holding.geography || 'ללא אזור'}</span>
                )}
              </td>
              <td data-label="הערה">
                <span className="cell-ellipsis" title={holding.note || undefined}>
                  {holding.note || '—'}
                </span>
              </td>
              <td className="investment-actions">
                <div className="investment-actions-inner">
                  <span className="investment-actions-hint" aria-hidden="true" title="לחיצה לעריכה">
                    <EditIcon />
                  </span>
                </div>
              </td>
            </tr>
          ))}
          {isFiltered && sortedHoldings.length === 0 ? (
            <tr>
              <td colSpan={9} className="filter-empty-row">
                <span>אין השקעות התואמות את הסינון.</span>
                <button type="button" className="filter-clear" onClick={() => setFilters(emptyFilters)}>נקה סינון</button>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
