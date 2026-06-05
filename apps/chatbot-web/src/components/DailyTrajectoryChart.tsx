import { useMemo, useState } from 'react';
import type { ExpenseTrajectoryPoint } from '../types';
import { formatAmount } from './ExpenseRow';

type Props = {
  readonly points: ReadonlyArray<ExpenseTrajectoryPoint>;
  readonly currency: string;
  readonly throughDayOfMonth: number;
  readonly daysInMonth: number;
  readonly isCurrentMonth: boolean;
};

const W = 320;
const H = 140;
const PAD_L = 28;
const PAD_R = 8;
const PAD_T = 12;
const PAD_B = 22;
const innerW = W - PAD_L - PAD_R;
const innerH = H - PAD_T - PAD_B;

export function DailyTrajectoryChart({ points, currency, throughDayOfMonth, daysInMonth, isCurrentMonth }: Props) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const { actualPath, expectedPath, maxY, latestActual, hasExpected } = useMemo(() => {
    let max = 0;
    for (const p of points) {
      if (p.actual !== null && p.actual > max) max = p.actual;
      if (p.expected !== null && p.expected > max) max = p.expected;
    }
    if (max === 0) max = 1;

    const xFor = (d: number) => PAD_L + ((d - 1) / Math.max(1, daysInMonth - 1)) * innerW;
    const yFor = (v: number) => PAD_T + innerH - (v / max) * innerH;

    let actualPath = '';
    let lastActual: number | null = null;
    for (const p of points) {
      if (p.actual === null) break;
      const cmd = actualPath === '' ? 'M' : 'L';
      actualPath += `${cmd} ${xFor(p.day).toFixed(1)} ${yFor(p.actual).toFixed(1)} `;
      lastActual = p.actual;
    }

    let expectedPath = '';
    let hasExpected = false;
    for (const p of points) {
      if (p.expected === null) continue;
      hasExpected = true;
      const cmd = expectedPath === '' ? 'M' : 'L';
      expectedPath += `${cmd} ${xFor(p.day).toFixed(1)} ${yFor(p.expected).toFixed(1)} `;
    }

    return { actualPath, expectedPath, maxY: max, latestActual: lastActual, hasExpected };
  }, [points, daysInMonth]);

  const hoverPoint = hoverDay !== null ? points.find((p) => p.day === hoverDay) : null;

  function handleMove(e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    const x = ((clientX - rect.left) / rect.width) * W;
    const dayFloat = ((x - PAD_L) / innerW) * (daysInMonth - 1) + 1;
    const day = Math.max(1, Math.min(daysInMonth, Math.round(dayFloat)));
    setHoverDay(day);
  }

  const xFor = (d: number) => PAD_L + ((d - 1) / Math.max(1, daysInMonth - 1)) * innerW;
  const yFor = (v: number) => PAD_T + innerH - (v / maxY) * innerH;

  const tickDays = uniqueTicks(daysInMonth);
  const yTicks: ReadonlyArray<{ value: number; y: number }> = [
    { value: 0, y: PAD_T + innerH },
    { value: maxY / 2, y: PAD_T + innerH / 2 },
    { value: maxY, y: PAD_T },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-wide text-text-muted">Daily trajectory</div>
        <div className="text-[11px] text-text-muted flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-[2px] bg-accent-primary rounded" /> Actual
          </span>
          {hasExpected && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-[2px] border-t border-dashed border-text-secondary" /> Expected
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ touchAction: 'none' }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverDay(null)}
        onTouchStart={handleMove}
        onTouchMove={handleMove}
        onTouchEnd={() => setHoverDay(null)}
      >
        {/* y baseline */}
        <line x1={PAD_L} y1={PAD_T + innerH} x2={W - PAD_R} y2={PAD_T + innerH} className="stroke-border-subtle" strokeWidth="1" />

        {/* y-axis labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            {i > 0 && (
              <line
                x1={PAD_L}
                y1={t.y}
                x2={W - PAD_R}
                y2={t.y}
                className="stroke-border-subtle"
                opacity={0.35}
                strokeDasharray="2 3"
              />
            )}
            <text x={PAD_L - 4} y={t.y + 3} textAnchor="end" fontSize="9" className="fill-text-muted tabular">
              {abbreviateAmount(t.value, currency)}
            </text>
          </g>
        ))}
        {/* Today marker */}
        {isCurrentMonth && (
          <line
            x1={xFor(throughDayOfMonth)}
            y1={PAD_T}
            x2={xFor(throughDayOfMonth)}
            y2={PAD_T + innerH}
            className="stroke-border-subtle"
            strokeDasharray="2 3"
          />
        )}

        {/* Expected line (dashed) */}
        {hasExpected && (
          <path d={expectedPath} fill="none" className="stroke-text-secondary" strokeWidth="1.5" strokeDasharray="3 3" opacity={0.6} />
        )}

        {/* Actual line */}
        {actualPath && <path d={actualPath} fill="none" className="stroke-accent-primary" strokeWidth="2" />}

        {/* End-of-actual dot */}
        {latestActual !== null && (
          <circle cx={xFor(throughDayOfMonth)} cy={yFor(latestActual)} r="3" className="fill-accent-primary" />
        )}

        {/* Hover indicator */}
        {hoverPoint && (
          <>
            <line x1={xFor(hoverPoint.day)} y1={PAD_T} x2={xFor(hoverPoint.day)} y2={PAD_T + innerH} className="stroke-text-muted" opacity={0.4} />
            {hoverPoint.actual !== null && (
              <circle cx={xFor(hoverPoint.day)} cy={yFor(hoverPoint.actual)} r="3.5" className="fill-accent-primary" />
            )}
          </>
        )}

        {/* X ticks */}
        {tickDays.map((d) => (
          <text key={d} x={xFor(d)} y={H - 6} textAnchor="middle" fontSize="9" className="fill-text-muted">
            {d}
          </text>
        ))}
      </svg>

      <div className="text-xs text-text-secondary min-h-[18px]">
        {hoverPoint ? (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-text-muted">Day {hoverPoint.day}</span>
            {hoverPoint.actual !== null && (
              <span>
                Actual <span className="font-medium text-text-primary tabular">{formatAmount(hoverPoint.actual, currency)}</span>
              </span>
            )}
            {hoverPoint.expected !== null && (
              <span className="text-text-muted">
                Expected <span className="tabular">{formatAmount(hoverPoint.expected, currency)}</span>
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-muted">Tap or hover to inspect a day</span>
        )}
      </div>
    </div>
  );
}

function uniqueTicks(daysInMonth: number): number[] {
  const candidates = [1, 7, 14, 21, 28, daysInMonth];
  return Array.from(new Set(candidates.filter((d) => d >= 1 && d <= daysInMonth))).sort((a, b) => a - b);
}

const CURRENCY_SYMBOL: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£', JPY: '¥' };

function abbreviateAmount(value: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? '';
  if (value <= 0) return `${sym}0`;
  if (value >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `${sym}${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${sym}${Math.round(value)}`;
}
