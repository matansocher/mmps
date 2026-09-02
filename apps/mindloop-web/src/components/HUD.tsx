import { cx } from '../lib/utils';

interface Props {
  accent: string;
  score: number;
  scoreLabel?: string;
  /** Seconds remaining; omit to hide the timer. */
  time?: number;
  /** Fraction 0..1 for the timer bar; defaults to time/totalTime. */
  timeFraction?: number;
  /** Optional right-side status text (e.g. "Round 3"). */
  status?: string;
  /** Optional custom node rendered in place of `status` (e.g. SVG life pips). */
  statusNode?: React.ReactNode;
  /** Label shown above the status box. Defaults to "Round". */
  statusLabel?: string;
}

export function HUD({ accent, score, scoreLabel = 'Score', time, timeFraction, status, statusNode, statusLabel = 'Round' }: Props) {
  const showTime = typeof time === 'number';
  const frac = timeFraction ?? 0;
  const low = showTime && time! <= 5;
  const showStatus = statusNode != null || status != null;

  return (
    <div className="flex w-full items-center gap-3">
      <div className="min-w-[4.5rem] rounded-2xl bg-white/80 px-4 py-2 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{scoreLabel}</div>
        <div className="text-xl font-extrabold tabular-nums" style={{ color: accent }}>
          {score}
        </div>
      </div>

      {showStatus && (
        <div className="rounded-2xl bg-white/80 px-4 py-2 text-center shadow-sm ring-1 ring-slate-100 dark:bg-white/10 dark:ring-white/10">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{statusLabel}</div>
          <div className="flex h-7 items-center justify-center text-xl font-extrabold tabular-nums text-slate-700 dark:text-slate-100">
            {statusNode ?? status}
          </div>
        </div>
      )}

      {showTime && (
        <div className="flex flex-1 items-center gap-2">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
            <div
              className={cx('h-full rounded-full transition-[width] duration-100 ease-linear')}
              style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: low ? '#ef4444' : accent }}
            />
          </div>
          <div
            className={cx('w-12 text-right text-lg font-extrabold tabular-nums', low ? 'text-red-500' : 'text-slate-600 dark:text-slate-300')}
          >
            {Math.ceil(time!)}
          </div>
        </div>
      )}
    </div>
  );
}
