import { useNow } from '../hooks/useNow';
import { formatKickoff } from '../lib/format';
import { buildSlots, HOUR_MS, type HeatSlot } from '../lib/heatmap';
import { useT } from '../lib/i18n';
import type { Game } from '../types';

type Props = {
  readonly games: readonly Game[];
  readonly activeSlot: number | null;
  readonly onSelect: (slotStart: number | null) => void;
};

function clock(ms: number): string {
  return formatKickoff(new Date(ms).toISOString());
}

export function slotRange(start: number): string {
  return `${clock(start)}–${clock(start + HOUR_MS)}`;
}

function hourLabel(ms: number): string {
  return clock(ms).slice(0, 2);
}

function slotStyle(slot: HeatSlot, max: number) {
  const intensity = 0.25 + 0.75 * (slot.games / max);
  return slot.live ? { backgroundColor: `rgb(0 210 106 / ${intensity})` } : { backgroundColor: `rgb(59 130 246 / ${intensity})` };
}

export function MatchdayHeatmap({ games, activeSlot, onSelect }: Props) {
  const t = useT().dashboard;
  const now = useNow(60_000);
  const slots = buildSlots(games);
  if (slots.length < 2) return null;
  const max = Math.max(...slots.map((s) => s.games));
  const rangeStart = slots[0].start;
  const rangeEnd = slots[slots.length - 1].start + HOUR_MS;
  const nowPct = ((now - rangeStart) / (rangeEnd - rangeStart)) * 100;
  const showNow = nowPct >= 0 && nowPct <= 100;

  return (
    <div role="group" aria-label={t.heatmap} className="no-scrollbar -mx-1 overflow-x-auto px-1">
      <div className="relative min-w-full pt-1" style={{ width: `${slots.length * 28}px` }}>
        <div className="flex gap-0.5">
          {slots.map((slot) => {
            if (!slot.games) return <span key={slot.start} aria-hidden className="h-6 min-w-6 flex-1 rounded bg-white/[0.03]" />;
            const pressed = activeSlot === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                aria-pressed={pressed}
                aria-label={t.heatmapSlot(slotRange(slot.start), slot.games, slot.live)}
                title={t.heatmapSlot(slotRange(slot.start), slot.games, slot.live)}
                onClick={() => onSelect(pressed ? null : slot.start)}
                style={slotStyle(slot, max)}
                className={`h-6 min-w-6 flex-1 rounded transition duration-150 ease-out hover:brightness-125 ${pressed ? 'ring-2 ring-text-primary ring-offset-2 ring-offset-bg-base' : ''}`}
              />
            );
          })}
        </div>
        {showNow && (
          <span aria-hidden className="pointer-events-none absolute top-0 h-8 w-0.5 -translate-x-1/2 rounded-full bg-text-primary rtl:translate-x-1/2" style={{ insetInlineStart: `${nowPct}%` }}>
            <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-text-primary" />
          </span>
        )}
        <div aria-hidden className="mt-1 flex gap-0.5">
          {slots.map((slot) => (
            <span key={slot.start} className="ltr-num min-w-6 flex-1 text-start text-[10px] leading-3 text-text-muted">
              {hourLabel(slot.start)}
            </span>
          ))}
        </div>
        {showNow && <span className="sr-only">{`${t.nowMarker} ${clock(now)}`}</span>}
      </div>
    </div>
  );
}
