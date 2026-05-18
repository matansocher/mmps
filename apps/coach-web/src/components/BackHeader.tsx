import type { ReactNode } from 'react';

type Props = {
  onBack: () => void;
  title?: ReactNode;
  trailing?: ReactNode;
};

export function BackHeader({ onBack, title, trailing }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-bg-base/85 backdrop-blur border-b border-border-subtle px-2 py-2 flex items-center gap-2">
      <button
        onClick={onBack}
        aria-label="חזור"
        className="w-9 h-9 grid place-items-center rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2">{title}</div>
      {trailing}
    </header>
  );
}
