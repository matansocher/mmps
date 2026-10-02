import { useEffect, useRef } from 'react';
import type { QuizState } from '../game/quiz';
import { score } from '../game/quiz';
import type { Country } from '../types';
import { Icon } from './Icon';

type Props = {
  readonly quiz: QuizState;
  readonly byCode: ReadonlyMap<string, Country>;
  readonly best: number;
  readonly newBest: boolean;
  readonly onPlayAgain: () => void;
  readonly onShowCountry: (code: string) => void;
};

export function RoundSummary({ quiz, byCode, best, newBest, onPlayAgain, onShowCountry }: Props) {
  const playRef = useRef<HTMLButtonElement>(null);
  useEffect(() => playRef.current?.focus(), []);
  const total = quiz.questions.length;

  return (
    <section className="glass fixed bottom-3 left-1/2 z-30 flex max-h-[min(70dvh,640px)] w-[min(400px,calc(100vw-24px))] -translate-x-1/2 flex-col rounded-2xl sm:top-4 sm:bottom-auto sm:left-4 sm:max-h-[calc(100dvh-32px)] sm:translate-x-0" aria-label="Round results">
      <div className="px-6 pt-6 pb-4 text-center">
        <div className="text-sm text-white/55">Round complete</div>
        <div className="mt-1 text-5xl font-semibold tabular-nums">
          {score(quiz)}
          <span className="text-2xl text-white/45"> / {total}</span>
        </div>
        <div className={`mt-2 text-sm ${newBest ? 'font-medium text-[#5bd27a]' : 'text-white/55'}`}>{newBest ? 'New best score!' : `Best: ${best} / ${total}`}</div>
      </div>
      <ul className="scroll-thin flex-1 overflow-y-auto border-y border-white/10 px-3 py-2">
        {quiz.answers.map(({ target, guess, correct }) => {
          const country = byCode.get(target);
          const picked = guess ? byCode.get(guess) : undefined;
          return (
            <li key={target}>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5" onClick={() => onShowCountry(target)}>
                <span className={`w-4 text-center font-bold ${correct ? 'text-[#5bd27a]' : 'text-[#ff7b6e]'}`}>{correct ? '✓' : '✗'}</span>
                <span className="min-w-0 flex-1 truncate">
                  {country?.flag} {country?.name}
                </span>
                {!correct && <span className="shrink-0 truncate text-xs text-white/45">{picked ? `picked ${picked.name}` : 'skipped'}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="p-4">
        <button ref={playRef} type="button" className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent-strong)] py-2.5 font-medium text-white hover:brightness-110" onClick={onPlayAgain}>
          <Icon name="replay" size={18} /> Play again
        </button>
      </div>
    </section>
  );
}
