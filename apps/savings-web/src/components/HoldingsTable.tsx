import { useMemo, useState } from 'react';
import { formatIls, formatPercent } from '../lib/format';
import type { Holding } from '../types';
import { EditIcon } from './Icons';
import { Select } from './Select';

type SortKey = 'name' | 'currentAmountIls' | 'share' | 'account' | 'currencyExposure' | 'assetType' | 'category' | 'note';
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
  category: 'פרטים',
  note: 'הערה',
};

function numericValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

const OWNER_EMOJI: Readonly<Record<Holding['owner'], string>> = {
  guy: '👦',
  tody: '👧',
  shared: '👦👧',
};

const OWNER_LABEL: Readonly<Record<Holding['owner'], string>> = {
  guy: 'גוז',
  tody: 'תודי',
  shared: 'משותף',
};

function compareHoldings(first: Holding, second: Holding, sortKey: SortKey, total: number): number {
  if (sortKey === 'currentAmountIls') return first.currentAmountIls - second.currentAmountIls;
  if (sortKey === 'share') return total > 0 ? first.currentAmountIls / total - second.currentAmountIls / total : 0;

  const firstValue = sortKey === 'category' ? `${first.category} ${first.geography}` : first[sortKey];
  const secondValue = sortKey === 'category' ? `${second.category} ${second.geography}` : second[sortKey];
  return String(firstValue).localeCompare(String(secondValue), 'he', {
    sensitivity: 'base',
    numeric: true,
  });
}

export function HoldingsTable({ holdings, editable, onAmountChange, onRowClick }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ascending');
  const total = holdings.reduce((sum, holding) => sum + numericValue(holding.currentAmountIls), 0);
  const sortedHoldings = useMemo(() => {
    const direction = sortDirection === 'ascending' ? 1 : -1;
    return [...holdings].sort((first, second) => {
      const comparison = compareHoldings(first, second, sortKey, total);
      return comparison === 0 ? first.name.localeCompare(second.name, 'he') : comparison * direction;
    });
  }, [holdings, sortDirection, sortKey, total]);

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

  return (
    <div className="investments-table-wrap">
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
            <th className="details-header-cell" aria-sort={sortKey === 'category' ? sortDirection : 'none'}>
              <button className="table-sort-button" type="button" onClick={() => changeSort('category')}>
                <span className="details-header-grid">
                  <span>קטגוריה</span>
                  <span>אזור</span>
                </span>
                <span className={`sort-indicator${sortKey === 'category' ? ' is-active' : ''}`} aria-hidden="true">
                  {sortKey === 'category' && sortDirection === 'descending' ? '↓' : '↑'}
                </span>
              </button>
            </th>
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
                  <span className="owner-emoji" aria-label={`בעלים: ${OWNER_LABEL[holding.owner ?? 'shared']}`} title={OWNER_LABEL[holding.owner ?? 'shared']}>
                    {OWNER_EMOJI[holding.owner ?? 'shared']}
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
                <span className={`badge badge-currency-${holding.currencyExposure}`}>{holding.currencyExposure === 'fx' ? 'מט״ח' : 'שקלי'}</span>
              </td>
              <td data-label="סוג נכס">
                <span className={`badge badge-asset-${holding.assetType}`}>{holding.assetType === 'solid' ? 'סולידי' : 'מנייתי'}</span>
              </td>
              <td className="investment-details-cell" data-label="פרטים">
                <div className="details-readonly">
                  <span className="readonly-category cell-ellipsis" title={holding.category || 'ללא קטגוריה'}>
                    {holding.category || 'ללא קטגוריה'}
                  </span>
                  <span className="badge badge-geo">{holding.geography || 'ללא אזור'}</span>
                </div>
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
        </tbody>
      </table>
    </div>
  );
}
