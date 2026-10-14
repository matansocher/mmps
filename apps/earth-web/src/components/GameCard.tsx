import type { ReactNode } from 'react';
import { Icon } from './Icon';

type Props = {
  readonly title: string;
  readonly status: ReactNode;
  readonly aside: ReactNode;
  readonly onChangeMode: () => void;
  readonly children: ReactNode;
};

export function GameCard({ title, status, aside, onChangeMode, children }: Props) {
  return (
    <section className="panel animate-rise fixed top-3 left-1/2 z-20 w-[min(560px,calc(100vw-20px))] -translate-x-1/2 rounded-2xl px-4 pt-2.5 pb-4 sm:top-4 sm:px-5" aria-live="polite">
      <div className="mb-2.5 flex items-center gap-3 text-[14px] text-white/55 tabular-nums">
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <span className="truncate font-semibold text-white/90">{title}</span>
          <span className="shrink-0">{status}</span>
        </span>
        <span className="shrink-0 font-semibold text-white/80">{aside}</span>
        <button type="button" className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/55 hover:bg-white/10 hover:text-white" aria-label="Back to menu" title="Back to menu (M)" onClick={onChangeMode}>
          <Icon name="close" size={18} />
        </button>
      </div>
      {children}
    </section>
  );
}
