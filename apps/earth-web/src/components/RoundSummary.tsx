import { useEffect, useRef, useState } from 'react';
import { type RoundOutcome, tierFor } from '../game/progression';
import { prefersReducedMotion } from '../lib/motion';
import { useProgress } from '../store/progress';
import { playChime } from '../store/sound';
import type { Country } from '../types';
import { Icon } from './Icon';

export type SummaryItem = {
  readonly code: string;
  readonly correct: boolean;
  readonly note?: string;
};

type Props = {
  readonly title: string;
  readonly flight: string;
  readonly score: number;
  readonly outOf: number;
  readonly best: number;
  readonly newBest: boolean;
  readonly items: readonly SummaryItem[];
  readonly byCode: ReadonlyMap<string, Country>;
  readonly outcome: RoundOutcome | null;
  readonly onPlayAgain?: () => void;
  readonly onChangeMode: () => void;
  readonly onShowCountry: (code: string) => void;
};

function useCountUp(target: number, ms = 900): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min((now - start) / ms, 1);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

// Bars derived from the flight code, so every pass gets its own stable barcode.
function Barcode({ seed }: { readonly seed: string }) {
  let h = 7;
  const bars = Array.from({ length: 42 }, (_, i) => {
    h = (h * 31 + seed.charCodeAt(i % seed.length)) % 997;
    return 1 + (h % 3);
  });
  return (
    <div className="flex h-10 items-stretch gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => (
        <span key={i} className={i % 2 ? 'bg-transparent' : 'bg-[var(--color-paper-ink)]'} style={{ width: w }} />
      ))}
    </div>
  );
}

function Field({ label, children, wide }: { readonly label: string; readonly children: React.ReactNode; readonly wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <div className="board-type text-[12px] font-semibold tracking-[0.12em] text-[var(--color-paper-ink)]/55">{label}</div>
      <div className="board-type text-[22px] leading-tight font-bold">{children}</div>
    </div>
  );
}

export function RoundSummary({ title, flight, score, outOf, best, newBest, items, byCode, outcome, onPlayAgain, onChangeMode, onShowCountry }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const progress = useProgress();
  const earned = useCountUp(outcome?.earned ?? 0);
  const { tier, next, progress: toNext } = tierFor(progress.miles);
  const suffix = `/${outOf}`;
  const from = byCode.get(items[0]?.code ?? '');
  const to = byCode.get(items.at(-1)?.code ?? '');

  useEffect(() => {
    primaryRef.current?.focus();
    playChime();
  }, []);

  return (
    <section
      className="animate-rise fixed bottom-2 left-1/2 z-30 flex max-h-[min(78dvh,720px)] w-[min(420px,calc(100vw-16px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl bg-[var(--color-paper)] text-[var(--color-paper-ink)] shadow-[0_24px_60px_rgb(0_0_0/0.55)] sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:translate-x-0"
      aria-label="Round results"
    >
      <header className="board-type flex items-center justify-between bg-[var(--color-ink)] px-5 py-2.5 text-[15px] font-semibold text-[var(--color-paper)]">
        <span className="flex items-center gap-2">
          <Icon name="plane" size={16} className="rotate-45 text-[var(--color-signage)]" /> Boarding pass · {title}
        </span>
        <span className="text-[var(--color-signage)]">{flight}</span>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="px-5 pt-4">
          {from && to && (
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="board-type text-[44px] leading-none font-bold">{from.code}</div>
                <div className="truncate text-[13px] opacity-70">{from.name}</div>
              </div>
              <div className="mb-5 flex flex-1 items-center gap-1 opacity-50" aria-hidden="true">
                <span className="h-px flex-1 border-t-2 border-dotted border-current" />
                <Icon name="plane" size={20} className="rotate-90" />
                <span className="h-px flex-1 border-t-2 border-dotted border-current" />
              </div>
              <div className="min-w-0 text-right">
                <div className="board-type text-[44px] leading-none font-bold">{to.code}</div>
                <div className="truncate text-[13px] opacity-70">{to.name}</div>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
            <Field label="Score">
              {score}
              <span className="text-[16px] opacity-55">{suffix}</span>
            </Field>
            <Field label="Miles">
              <span className="text-[#1f7a4d]">+{earned.toLocaleString()}</span>
            </Field>
            <Field label={newBest ? 'New best' : 'Best'}>
              {newBest ? (
                <span className="rounded bg-[var(--color-signage)] px-1">
                  {score}
                  {suffix}
                </span>
              ) : (
                `${best}${suffix}`
              )}
            </Field>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="board-type text-[17px] font-bold">{outcome?.tierUp ? `Upgraded to ${tier.name}!` : `${tier.name} class`}</span>
              <span className="tabular-nums opacity-70">{next ? `${(next.miles - progress.miles).toLocaleString()} mi to ${next.name}` : `${progress.miles.toLocaleString()} mi`}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-paper-ink)]/12" role="progressbar" aria-label={`Progress to ${next?.name ?? 'top tier'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toNext * 100)}>
              <div className="h-full rounded-full bg-[var(--color-paper-ink)] transition-[width] duration-700" style={{ width: `${toNext * 100}%` }} />
            </div>
          </div>

          {outcome && (outcome.newStamps.length > 0 || outcome.unlocked.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
              {outcome.newStamps.length > 0 && (
                <li className="rounded-full border border-[#1f7a4d]/40 px-2.5 py-0.5 font-bold text-[#1f7a4d]">
                  +{outcome.newStamps.length} new passport stamp{outcome.newStamps.length > 1 ? 's' : ''}
                </li>
              )}
              {outcome.unlocked.map((a) => (
                <li key={a.id} className="rounded-full bg-[var(--color-paper-ink)] px-2.5 py-0.5 font-bold text-[var(--color-signage)]" title={a.detail}>
                  ★ {a.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="perforation mx-0 mt-4 px-3 pt-2 pb-1">
          <ul aria-label="Itinerary">
            {items.map(({ code, correct, note }, i) => {
              const country = byCode.get(code);
              return (
                <li key={`${code}-${i}`}>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] hover:bg-[var(--color-paper-ink)]/6" onClick={() => onShowCountry(code)}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded text-[12px] font-bold text-white ${correct ? 'bg-[#1f8a57]' : 'bg-[#c8321f]'}`} aria-label={correct ? 'Found' : 'Missed'}>
                      {correct ? '✓' : '✗'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {country?.flag} {country?.name}
                    </span>
                    {note && <span className="shrink-0 truncate text-[12px] opacity-55">{note}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--color-paper-ink)]/12 px-5 pt-3 pb-4">
        <Barcode seed={flight + score} />
        <div className="ml-auto flex gap-2">
          <button ref={onPlayAgain ? undefined : primaryRef} type="button" className="btn btn-paper" onClick={onChangeMode}>
            Departures
          </button>
          {onPlayAgain && (
            <button ref={primaryRef} type="button" className="btn btn-signage" onClick={onPlayAgain}>
              <Icon name="replay" size={18} /> Fly again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
