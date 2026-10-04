import type { QuizState } from '../game/quiz';
import { lastAnswer, score } from '../game/quiz';
import type { Country } from '../types';
import { GameCard } from './GameCard';
import { Icon } from './Icon';
import { SplitFlap } from './SplitFlap';

type Props = {
  readonly title: string;
  readonly quiz: QuizState;
  readonly byCode: ReadonlyMap<string, Country>;
  readonly hint: string | null;
  readonly onSkip: () => void;
  readonly onNext: () => void;
  readonly onChangeMode: () => void;
};

export function Legs({ quiz }: { readonly quiz: QuizState }) {
  return (
    <ol className="flex gap-1" aria-label={`Question ${quiz.index + 1} of ${quiz.questions.length}`}>
      {quiz.questions.map((code, i) => {
        const result = quiz.answers[i];
        const tone = result ? (result.correct ? 'bg-[var(--color-ok)] text-[var(--color-ink)]' : 'bg-[var(--color-bad)] text-[var(--color-ink)]') : i === quiz.index ? 'bg-transparent ring-2 ring-[var(--color-signage)] ring-inset' : 'bg-white/10';
        return (
          <li key={code} className={`grid h-4 flex-1 place-items-center rounded-[3px] text-[10px] font-bold ${tone}`} aria-hidden="true">
            {result ? (result.correct ? '✓' : '✗') : ''}
          </li>
        );
      })}
    </ol>
  );
}

export function TargetBoard({ country, sound = true }: { readonly country: Country | undefined; readonly sound?: boolean }) {
  if (!country) return null;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--color-tile)] text-2xl" aria-hidden="true">
        {country.flag}
      </span>
      <SplitFlap text={country.name} sound={sound} className="text-[24px] sm:text-[30px]" />
    </div>
  );
}

export function QuizCard({ title, quiz, byCode, hint, onSkip, onNext, onChangeMode }: Props) {
  const target = byCode.get(quiz.questions[quiz.index]);
  const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
  const guess = last?.guess ? byCode.get(last.guess) : undefined;

  return (
    <GameCard title={title} status={`· ${quiz.index + 1}/${quiz.questions.length}`} aside={`Score ${score(quiz)}`} onChangeMode={onChangeMode}>
      <Legs quiz={quiz} />
      <div className="mt-3 flex items-center gap-3">
        <TargetBoard key={quiz.index} country={target} />
        {quiz.phase === 'asking' && (
          <button type="button" className="btn shrink-0" onClick={onSkip} title="Skip (S)">
            Skip
          </button>
        )}
        {last && !last.correct && (
          <button type="button" className="btn btn-signage shrink-0" onClick={onNext} title="Next (Enter)" autoFocus>
            Next <Icon name="next" size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 min-h-5 text-[15px]">
        {quiz.phase === 'asking' && <span className="text-white/60">{hint ?? 'Spin the globe and tap the country.'}</span>}
        {last?.correct && (
          <span className="flex items-center gap-1.5 font-bold text-[var(--color-ok)]">
            <Icon name="check" size={18} /> Cleared for landing
          </span>
        )}
        {last && !last.correct && (
          <span className="block min-w-0">
            <span className="board-type mr-2 rounded bg-[var(--color-bad)] px-1.5 py-0.5 text-[14px] font-bold text-[var(--color-ink)]">✗ Gate change</span>
            <span className="text-white/75">{guess ? `That’s ${guess.name}. ` : 'Skipped. '}The right one is in green.</span>
          </span>
        )}
      </div>
    </GameCard>
  );
}
