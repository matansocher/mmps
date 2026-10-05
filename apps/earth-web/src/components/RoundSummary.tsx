import { useEffect, useRef, useState } from 'react';
import { levelFor, type RoundOutcome } from '../game/progression';
import { prefersReducedMotion } from '../lib/motion';
import { useProgress } from '../store/progress';
import { playComplete } from '../store/sound';
import type { Country } from '../types';
import { Icon } from './Icon';

export type SummaryItem = {
  readonly code: string;
  readonly correct: boolean;
  readonly note?: string;
};

type Props = {
  readonly title: string;
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

function Stat({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--color-tile)] px-3 py-2">
      <div className="text-[12px] font-semibold text-white/50">{label}</div>
      <div className="text-[22px] leading-tight font-bold tabular-nums">{children}</div>
    </div>
  );
}

export function RoundSummary({ title, score, outOf, best, newBest, items, byCode, outcome, onPlayAgain, onChangeMode, onShowCountry }: Props) {
  const primaryRef = useRef<HTMLButtonElement>(null);
  const progress = useProgress();
  const earned = useCountUp(outcome?.earned ?? 0);
  const { level, next, progress: toNext } = levelFor(progress.miles);
  const suffix = `/${outOf}`;

  useEffect(() => {
    primaryRef.current?.focus();
    playComplete();
  }, []);

  return (
    <section
      className="panel animate-rise fixed bottom-2 left-1/2 z-30 flex max-h-[min(78dvh,720px)] w-[min(420px,calc(100vw-16px))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:translate-x-0"
      aria-label="Round results"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-rule)] px-5 py-3">
        <span className="text-[15px] font-semibold text-white/60">Results · {title}</span>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto">
        <div className="px-5 pt-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Score">
              {score}
              <span className="text-[16px] text-white/45">{suffix}</span>
            </Stat>
            <Stat label="XP">
              <span className="text-[var(--color-ok)]">+{earned.toLocaleString()}</span>
            </Stat>
            <Stat label={newBest ? 'New best!' : 'Best'}>
              <span className={newBest ? 'text-[var(--color-accent-soft)]' : undefined}>
                {newBest ? score : best}
                <span className="text-[16px] text-white/45">{suffix}</span>
              </span>
            </Stat>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-[16px] font-bold">{outcome?.levelUp ? `Level up! Level ${level.level}` : `Level ${level.level}`}</span>
              <span className="text-white/55 tabular-nums">{next ? `${(next.xp - progress.miles).toLocaleString()} XP to level ${next.level}` : `${progress.miles.toLocaleString()} XP`}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={next ? `Progress to level ${next.level}` : 'Max level'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(toNext * 100)}>
              <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700" style={{ width: `${toNext * 100}%` }} />
            </div>
          </div>

          {outcome && (outcome.newCountries.length > 0 || outcome.unlocked.length > 0) && (
            <ul className="mt-3 flex flex-wrap gap-1.5 text-[13px]">
              {outcome.newCountries.length > 0 && (
                <li className="rounded-full border border-[var(--color-ok)]/40 px-2.5 py-0.5 font-bold text-[var(--color-ok)]">
                  +{outcome.newCountries.length} new countr{outcome.newCountries.length > 1 ? 'ies' : 'y'} found
                </li>
              )}
              {outcome.unlocked.map((a) => (
                <li key={a.id} className="rounded-full bg-[var(--color-accent)]/20 px-2.5 py-0.5 font-bold text-[var(--color-accent-soft)]" title={a.detail}>
                  ★ {a.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-[var(--color-rule)] px-3 pt-2 pb-1">
          <ul aria-label="Answers">
            {items.map(({ code, correct, note }, i) => {
              const country = byCode.get(code);
              return (
                <li key={`${code}-${i}`}>
                  <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-[14px] hover:bg-white/6" onClick={() => onShowCountry(code)}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[12px] font-bold text-[#0b1220] ${correct ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-bad)]'}`} aria-label={correct ? 'Found' : 'Missed'}>
                      {correct ? '✓' : '✗'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {country?.flag} {country?.name}
                    </span>
                    {note && <span className="shrink-0 truncate text-[12px] text-white/45">{note}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-[var(--color-rule)] px-5 pt-3 pb-4">
        <button ref={onPlayAgain ? undefined : primaryRef} type="button" className="btn" onClick={onChangeMode}>
          Menu
        </button>
        {onPlayAgain && (
          <button ref={primaryRef} type="button" className="btn btn-primary" onClick={onPlayAgain}>
            <Icon name="replay" size={18} /> Play again
          </button>
        )}
      </div>
    </section>
  );
}
