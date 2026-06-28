import { useMemo } from 'react';
import { getCategoryEmoji } from '../lib/categories';
import type { ExpenseCategoryDelta } from '../types';
import { DeltaChip } from './DeltaChip';
import { formatAmount } from './ExpenseRow';

type Props = {
  readonly rows: ReadonlyArray<ExpenseCategoryDelta>;
  readonly currency: string;
  readonly selected: string | null;
  readonly onToggle: (category: string) => void;
  readonly centerLabelTop?: string;
};

// A friendly, distinct palette tuned for both dark and light Telegram themes.
const PALETTE = [
  '#5AA7FF',
  '#FF8A5A',
  '#7BD389',
  '#FFB454',
  '#C58CFF',
  '#FF6F91',
  '#4FD1C5',
  '#F2C94C',
  '#A0AEC0',
  '#E879F9',
  '#60A5FA',
  '#FB923C',
  '#34D399',
  '#F87171',
];

const SIZE = 140;
const RADIUS = 62;
const INNER = 38;
const CENTER = SIZE / 2;

export function CategoryPieChart({ rows, currency, selected, onToggle, centerLabelTop = 'This month' }: Props) {
  const { slices, total } = useMemo(() => {
    const ofCurrency = rows.filter((r) => r.currency === currency);
    const sorted = [...ofCurrency].sort((a, b) => b.currentTotal - a.currentTotal);
    const sum = sorted.reduce((s, r) => s + r.currentTotal, 0);
    let acc = 0;
    const built = sorted.map((r, i) => {
      const startAngle = sum > 0 ? (acc / sum) * Math.PI * 2 : 0;
      acc += r.currentTotal;
      const endAngle = sum > 0 ? (acc / sum) * Math.PI * 2 : 0;
      return { ...r, color: PALETTE[i % PALETTE.length], startAngle, endAngle };
    });
    return { slices: built, total: sum };
  }, [rows, currency]);

  if (slices.length === 0 || total === 0) {
    return <div className="text-sm text-text-muted py-6 text-center">No spending this month</div>;
  }

  const renderRow = (s: (typeof slices)[number]) => {
    const pct = Math.round((s.currentTotal / total) * 100);
    const isActive = selected === s.category;
    return (
      <button
        key={s.category}
        onClick={() => onToggle(s.category)}
        className={`flex items-center gap-2 text-left text-xs rounded-md px-2 py-1.5 transition-colors ${isActive ? 'bg-bg-elevated' : 'hover:bg-bg-elevated/60'}`}
      >
        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
        <span className="text-base leading-none">{getCategoryEmoji(s.category)}</span>
        <span className="capitalize text-text-secondary truncate">{s.category.replace(/_/g, ' ')}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="tabular text-text-primary">{formatAmount(s.currentTotal, currency)}</span>
          {s.percentVsHistoric !== null && <DeltaChip percent={s.percentVsHistoric} size="xs" />}
          <span className="tabular text-text-muted w-9 text-right">{pct}%</span>
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" style={{ width: 160, height: 160 }} aria-hidden="true">
        {slices.map((s) => {
          const isActive = selected === s.category;
          const dim = selected && !isActive ? 0.35 : 1;
          return (
            <path
              key={s.category}
              d={arcPath(s.startAngle, s.endAngle, isActive)}
              fill={s.color}
              opacity={dim}
              onClick={() => onToggle(s.category)}
              style={{ cursor: 'pointer', transition: 'opacity 120ms, d 150ms' }}
            />
          );
        })}
        <circle cx={CENTER} cy={CENTER} r={INNER} className="fill-bg-card" />
        <text x={CENTER} y={CENTER - 4} textAnchor="middle" fontSize="9" className="fill-text-muted uppercase">
          {centerLabelTop}
        </text>
        <text x={CENTER} y={CENTER + 10} textAnchor="middle" fontSize="13" className="fill-text-primary" style={{ fontWeight: 600 }}>
          {formatAmount(total, currency)}
        </text>
      </svg>
      <ul className="w-full flex flex-col gap-0.5">
        {slices.map((s) => (
          <li key={s.category}>{renderRow(s)}</li>
        ))}
      </ul>
    </div>
  );
}

function arcPath(startAngle: number, endAngle: number, active: boolean): string {
  const r = active ? RADIUS + 3 : RADIUS;
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 1e-6) {
    return `M ${CENTER - r} ${CENTER} A ${r} ${r} 0 1 1 ${CENTER + r} ${CENTER} A ${r} ${r} 0 1 1 ${CENTER - r} ${CENTER} Z`;
  }
  const x1 = CENTER + r * Math.sin(startAngle);
  const y1 = CENTER - r * Math.cos(startAngle);
  const x2 = CENTER + r * Math.sin(endAngle);
  const y2 = CENTER - r * Math.cos(endAngle);
  const largeArc = sweep > Math.PI ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}
