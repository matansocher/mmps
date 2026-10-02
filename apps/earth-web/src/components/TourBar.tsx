import type { TourState } from '../voyager/tour';
import { Icon } from './Icon';

export function TourBar({ tour, onPrev, onNext, onStop }: { readonly tour: TourState; readonly onPrev: () => void; readonly onNext: () => void; readonly onStop: () => void }) {
  const { stop, index, total } = tour;
  return (
    <div className="glass fixed bottom-10 left-1/2 z-20 w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl p-4 max-sm:bottom-[76px]" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/50">
            {total > 1 ? `Stop ${index + 1} of ${total}` : 'Voyager'} · {stop.subtitle}
          </div>
          <div className="text-lg font-semibold">{stop.title}</div>
          <p className="mt-1 text-sm leading-relaxed text-white/70">{stop.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {total > 1 && (
            <button type="button" className="icon-btn" aria-label="Previous stop" onClick={onPrev} disabled={index === 0}>
              <Icon name="prev" />
            </button>
          )}
          {total > 1 && (
            <button type="button" className="icon-btn" aria-label="Next stop" onClick={onNext} disabled={index === total - 1}>
              <Icon name="next" />
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Stop tour" onClick={onStop}>
            <Icon name="close" />
          </button>
        </div>
      </div>
      {total > 1 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--color-accent-strong)] transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
