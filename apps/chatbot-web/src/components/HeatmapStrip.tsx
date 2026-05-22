import type { HeatmapDay } from '../types';

type Props = { readonly days: ReadonlyArray<HeatmapDay> };

const WEEKDAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

export function HeatmapStrip({ days }: Props) {
  return (
    <div className="rounded-2xl bg-bg-card border border-border-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wide text-text-muted">Activity</div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span>Less</span>
          <Cell tone="empty" />
          <Cell tone="lit" />
          <span>More</span>
        </div>
      </div>
      <div className="flex gap-2">
        <div className="grid grid-rows-7 gap-1 text-[10px] text-text-muted shrink-0 pt-px">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="h-3 leading-3 flex items-center">
              {label}
            </div>
          ))}
        </div>
        <div
          className="grid grid-flow-col grid-rows-7 gap-1 flex-1"
          style={{ gridAutoColumns: 'minmax(0, 1fr)' }}
        >
          {days.map((d) => (
            <div
              key={d.date}
              title={`${d.date}${d.done ? ' — exercised' : ''}`}
              className={`aspect-square rounded-sm ${
                d.future ? 'bg-transparent' : d.done ? 'bg-accent-success' : 'bg-bg-elevated'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Cell({ tone }: { readonly tone: 'empty' | 'lit' }) {
  return <div className={`w-3 h-3 rounded-sm ${tone === 'lit' ? 'bg-accent-success' : 'bg-bg-elevated'}`} />;
}
