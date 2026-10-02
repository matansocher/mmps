import { useEffect, useRef } from 'react';
import type { Country } from '../types';
import { Icon } from './Icon';

export type SummaryItem = {
  readonly code: string;
  readonly correct: boolean;
  readonly note?: string;
};

type Props = {
  readonly heading: string;
  readonly score: number;
  readonly outOf?: number;
  readonly best: number;
  readonly newBest: boolean;
  readonly items: readonly SummaryItem[];
  readonly byCode: ReadonlyMap<string, Country>;
  readonly onPlayAgain: () => void;
  readonly onChangeMode: () => void;
  readonly onShowCountry: (code: string) => void;
};

export function RoundSummary({ heading, score, outOf, best, newBest, items, byCode, onPlayAgain, onChangeMode, onShowCountry }: Props) {
  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => playRef.current?.focus(), []);
  const suffix = outOf === undefined ? '' : ` / ${outOf}`;

  return (
    <section className="glass fixed bottom-3 left-1/2 z-30 flex max-h-[min(70dvh,640px)] w-[min(400px,calc(100vw-24px))] -translate-x-1/2 flex-col rounded-2xl sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:translate-x-0" aria-label="Round results">
      <div className="px-6 pt-6 pb-4 text-center">
        <div className="text-sm text-white/55">{heading}</div>
        <div className="mt-1 text-5xl font-semibold tabular-nums">
          {score}
          {suffix && <span className="text-2xl text-white/45">{suffix}</span>}
        </div>
        <div className={`mt-2 text-sm ${newBest ? 'font-medium text-[#5bd27a]' : 'text-white/55'}`}>{newBest ? 'New best score!' : `Best: ${best}${suffix}`}</div>
      </div>
      {items.length > 0 && (
        <ul className="scroll-thin flex-1 overflow-y-auto border-y border-white/10 px-3 py-2">
          {items.map(({ code, correct, note }, i) => {
            const country = byCode.get(code);
            return (
              <li key={`${code}-${i}`}>
                <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5" onClick={() => onShowCountry(code)}>
                  <span className={`w-4 text-center font-bold ${correct ? 'text-[#5bd27a]' : 'text-[#ff7b6e]'}`}>{correct ? '✓' : '✗'}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {country?.flag} {country?.name}
                  </span>
                  {note && <span className="shrink-0 truncate text-xs text-white/45">{note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2 p-4">
        <button type="button" className="flex-1 rounded-full border border-white/15 py-2.5 font-medium text-white/85 hover:bg-white/5" onClick={onChangeMode}>
          Change mode
        </button>
        <button ref={playRef} type="button" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-accent-strong)] py-2.5 font-medium text-white hover:brightness-110" onClick={onPlayAgain}>
          <Icon name="replay" size={18} /> Play again
        </button>
      </div>
    </section>
  );
}
