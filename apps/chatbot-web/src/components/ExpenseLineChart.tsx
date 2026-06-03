import { useMemo, useState } from 'react';
import type { ExpenseDailyPoint } from '../types';
import { formatAmount } from './ExpenseRow';

type Props = {
  readonly points: ReadonlyArray<ExpenseDailyPoint>;
  readonly currency: string;
};

const W = 320;
const H = 140;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 22;

export function ExpenseLineChart({ points, currency }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { coords, maxVal, total, avg } = useMemo(() => {
    const totals = points.map((p) => p.total);
    const max = Math.max(1, ...totals);
    const sum = totals.reduce((s, v) => s + v, 0);
    const a = totals.length ? sum / totals.length : 0;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_TOP - PAD_BOTTOM;
    const step = points.length > 1 ? innerW / (points.length - 1) : 0;
    const coordList = points.map((p, i) => ({
      x: PAD_X + step * i,
      y: PAD_TOP + innerH - (p.total / max) * innerH,
      ...p,
    }));
    return { coords: coordList, maxVal: max, total: sum, avg: a };
  }, [points]);

  if (points.length === 0) return null;

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(H - PAD_BOTTOM).toFixed(1)} Z`;
  const avgY = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) - (avg / maxVal) * (H - PAD_TOP - PAD_BOTTOM);

  const first = coords[0];
  const last = coords[coords.length - 1];
  const firstLabel = monthDay(first.date);
  const lastLabel = monthDay(last.date);
  const active = hoverIdx != null ? coords[hoverIdx] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-text-muted">Last 14 days</div>
        <div className="text-xs text-text-muted tabular">{formatAmount(total, currency)} total</div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
          <defs>
            <linearGradient id="expChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {avg > 0 && (
            <line
              x1={PAD_X}
              x2={W - PAD_X}
              y1={avgY}
              y2={avgY}
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}
          <path d={areaPath} fill="url(#expChartFill)" className="text-accent-primary" />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" className="text-accent-primary" />
          {coords.map((c, i) => (
            <g key={c.date}>
              <circle cx={c.x} cy={c.y} r="2.5" className="text-accent-primary" fill="currentColor" />
              <rect
                x={c.x - (coords[1] ? (coords[1].x - coords[0].x) / 2 : 12)}
                y={0}
                width={coords[1] ? coords[1].x - coords[0].x : 24}
                height={H}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                onTouchStart={() => setHoverIdx(i)}
                onTouchEnd={() => setHoverIdx(null)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          ))}
          {active && (
            <line x1={active.x} x2={active.x} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke="currentColor" strokeOpacity="0.3" strokeWidth="1" />
          )}
          <text x={PAD_X} y={H - 6} fontSize="10" className="fill-text-muted" textAnchor="start">{firstLabel}</text>
          <text x={W - PAD_X} y={H - 6} fontSize="10" className="fill-text-muted" textAnchor="end">{lastLabel}</text>
        </svg>
        {active && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded-md bg-bg-elevated border border-border-subtle text-[11px] text-text-primary shadow-sm whitespace-nowrap"
            style={{
              left: `${(active.x / W) * 100}%`,
              top: 4,
              transform: 'translateX(-50%)',
            }}
          >
            <span className="text-text-muted mr-1">{monthDay(active.date)}</span>
            <span className="tabular">{formatAmount(active.total, currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function monthDay(ymd: string): string {
  const [, m, d] = ymd.split('-');
  const monthIdx = Number(m) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[monthIdx]} ${Number(d)}`;
}
