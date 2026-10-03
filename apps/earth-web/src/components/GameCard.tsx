import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  readonly title: string;
  readonly status: ReactNode;
  readonly aside: ReactNode;
  readonly onChangeMode: () => void;
  readonly children: ReactNode;
};

// The in-game departures display: a meta line over the split-flap board.
export function GameCard({ title, status, aside, onChangeMode, children }: Props) {
  return (
    <section className="panel animate-rise fixed top-3 left-1/2 z-20 w-[min(560px,calc(100vw-20px))] -translate-x-1/2 rounded-xl px-4 pt-2.5 pb-4 sm:top-4 sm:px-5" aria-live="polite">
      <div className="board-type mb-2.5 flex items-center gap-3 text-[15px] text-white/55">
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <Icon name="plane" size={16} className="shrink-0 rotate-45 text-[var(--color-signage)]" />
          <span className="truncate font-semibold text-white/90">{title}</span>
          <span className="shrink-0">{status}</span>
        </span>
        <span className="shrink-0 font-semibold text-white/80">{aside}</span>
        <button type="button" className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" aria-label="Back to departures" title="Back to departures (M)" onClick={onChangeMode}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {children}
    </section>
  );
}
