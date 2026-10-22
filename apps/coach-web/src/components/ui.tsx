import type { KeyboardEvent, ReactNode } from 'react';
import { messages } from '../lib/i18n';
import { Icon } from './Icon';
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
  const select = (id: T) => {
    hapticSelect();
    onChange(id);
  };
  // Arrow keys move between tabs (mirrored in RTL), Home/End jump to the ends.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((tab) => tab.id === active);
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : step !== undefined ? (index + step + tabs.length) % tabs.length : -1;
    if (next < 0) return;
    e.preventDefault();
    select(tabs[next].id);
    (e.currentTarget.children[next] as HTMLElement | undefined)?.focus();
  };
  return (
    <div role="tablist" className="flex gap-1 rounded-xl bg-bg-card p-1" onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => select(tab.id)}
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
    <div role="status" className="flex justify-center py-16">
      <span className="sr-only">{messages().common.loading}</span>
      <span aria-hidden className="size-6 animate-spin rounded-full border-2 border-bg-elevated border-t-accent-live" />
    </div>
  );
}

export function ErrorState({ status, onRetry }: { readonly status: number; readonly onRetry?: () => void }) {
  const unauthorized = status === 401 || status === 403;
  const notFound = status === 404;
  const offline = !unauthorized && !notFound && typeof navigator !== 'undefined' && !navigator.onLine;
  const t = messages().errors;
  const icon = unauthorized ? 'lock' : notFound ? 'search' : offline ? 'wifiOff' : 'serverOff';
  const title = unauthorized ? t.unauthorizedTitle : notFound ? t.notFoundTitle : offline ? t.offlineTitle : t.failedTitle;
  const text = unauthorized ? t.unauthorizedText : notFound ? t.notFoundText : offline ? t.offlineText : t.failedText;
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center gap-3 px-6 text-center">
      <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-white/[0.04] text-text-muted">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-text-secondary">{text}</p>
      {onRetry && !unauthorized && !notFound && (
        <button onClick={onRetry} className="mt-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold transition hover:bg-white/[0.1]">
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
  return <span className={`score-font inline-flex size-5 shrink-0 items-center justify-center rounded text-caption ${color}`}>{messages().form[result]}</span>;
}
