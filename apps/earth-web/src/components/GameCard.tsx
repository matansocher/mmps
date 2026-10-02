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
    <section className="glass fixed top-4 left-1/2 z-20 w-[min(460px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl px-5 pt-3 pb-4" aria-live="polite">
      <div className="mb-2 flex items-center gap-2 text-xs text-white/55">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium text-white/80">{title}</span> · {status}
        </span>
        <span className="tabular-nums">{aside}</span>
        <button type="button" className="-mr-2 grid h-7 w-7 place-items-center rounded-full text-white/55 hover:bg-white/10 hover:text-white" aria-label="Change mode" title="Change mode (M)" onClick={onChangeMode}>
          <Icon name="close" size={16} />
        </button>
      </div>
      {children}
    </section>
  );
}
