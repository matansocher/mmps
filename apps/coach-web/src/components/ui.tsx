import type { ReactNode } from 'react';
import { messages } from '../lib/i18n';
import { hapticSelect } from '../lib/telegram';

export function Section({ title, right, children, className = '' }: { readonly title?: ReactNode; readonly right?: ReactNode; readonly children: ReactNode; readonly className?: string }) {
  return (
    <section className={`flex flex-col gap-2 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-2 px-1">
          {title && <h2 className="text-sm font-bold text-text-secondary">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) {
  return <div className={`overflow-hidden rounded-xl bg-bg-card ${className}`}>{children}</div>;
}

export function Tabs<T extends string>({ tabs, active, onChange }: { readonly tabs: readonly { readonly id: T; readonly label: string }[]; readonly active: T; readonly onChange: (id: T) => void }) {
  return (
    <div className="flex gap-1 rounded-xl bg-bg-card p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => {
            hapticSelect();
            onChange(tab.id);
          }}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${active === tab.id ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <span className="size-6 animate-spin rounded-full border-2 border-bg-elevated border-t-accent-live" />
    </div>
  );
}

export function ErrorState({ status, onRetry }: { readonly status: number; readonly onRetry?: () => void }) {
  const unauthorized = status === 401 || status === 403;
  const notFound = status === 404;
  const t = messages().errors;
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 px-6 text-center">
      <span className="text-4xl">{unauthorized ? '🔒' : notFound ? '🤷' : '📡'}</span>
      <p className="text-base font-semibold">{unauthorized ? t.unauthorizedTitle : notFound ? t.notFoundTitle : t.failedTitle}</p>
      <p className="text-sm text-text-secondary">
        {unauthorized ? t.unauthorizedText : notFound ? t.notFoundText : t.failedText}
      </p>
      {onRetry && !unauthorized && !notFound && (
        <button onClick={onRetry} className="mt-2 rounded-lg bg-accent-brand px-4 py-2 text-sm font-semibold">
          {messages().common.tryAgain}
        </button>
      )}
    </div>
  );
}

// Direction arrow that points forward in both LTR and RTL.
export function ForwardArrow() {
  return (
    <span aria-hidden className="inline-block rtl:-scale-x-100">
      →
    </span>
  );
}

// "home - away" laid out by flex, so the home score sits on the home side in both LTR and RTL.
export function ScoreLine({ home, away, className = '' }: { readonly home: ReactNode; readonly away: ReactNode; readonly className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.3em] ${className}`}>
      <span>{home}</span>
      <span>-</span>
      <span>{away}</span>
    </span>
  );
}

export function FormBadge({ result }: { readonly result: 'W' | 'D' | 'L' }) {
  const color = result === 'W' ? 'bg-accent-win text-bg-base' : result === 'D' ? 'bg-text-muted text-white' : 'bg-accent-red text-white';
  return <span className={`score-font inline-flex size-5 shrink-0 items-center justify-center rounded text-[10px] ${color}`}>{messages().form[result]}</span>;
}
