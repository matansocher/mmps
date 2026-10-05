import type { QuizState } from '../game/quiz';
import { lastAnswer, score } from '../game/quiz';
import type { Country } from '../types';
import { GameCard } from './GameCard';
import { Icon } from './Icon';

type Props = {
  readonly title: string;
  readonly quiz: QuizState;
  readonly byCode: ReadonlyMap<string, Country>;
  readonly hint: string | null;
  readonly onSkip: () => void;
  readonly onNext: () => void;
  readonly onChangeMode: () => void;
};

export function Progress({ quiz }: { readonly quiz: QuizState }) {
  return (
    <ol className="flex gap-1" aria-label={`Question ${quiz.index + 1} of ${quiz.questions.length}`}>
      {quiz.questions.map((code, i) => {
        const result = quiz.answers[i];
        const tone = result ? (result.correct ? 'bg-[var(--color-ok)]' : 'bg-[var(--color-bad)]') : i === quiz.index ? 'bg-transparent ring-2 ring-[var(--color-accent)] ring-inset' : 'bg-white/10';
        return (
          <li key={code} className={`grid h-2.5 flex-1 place-items-center rounded-full ${tone}`} aria-hidden="true">
            
          </li>
        );
      })}
    </ol>
  );
}

export function Target({ country }: { readonly country: Country | undefined }) {
  if (!country) return null;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[var(--color-tile)] text-2xl" aria-hidden="true">
        {country.flag}
      </span>
      <span className="min-w-0 truncate text-[24px] leading-tight font-bold sm:text-[28px]">{country.name}</span>
    </div>
  );
}

export function QuizCard({ title, quiz, byCode, hint, onSkip, onNext, onChangeMode }: Props) {
  const target = byCode.get(quiz.questions[quiz.index]);
  const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
  const guess = last?.guess ? byCode.get(last.guess) : undefined;

  return (
    <GameCard title={title} status={`· ${quiz.index + 1}/${quiz.questions.length}`} aside={`Score ${score(quiz)}`} onChangeMode={onChangeMode}>
      <Progress quiz={quiz} />
      <div className="mt-3 flex items-center gap-3">
        <Target key={quiz.index} country={target} />
        {quiz.phase === 'asking' && (
          <button type="button" className="btn shrink-0" onClick={onSkip} title="Skip (S)">
            Skip
          </button>
        )}
        {last && !last.correct && (
          <button type="button" className="btn btn-primary shrink-0" onClick={onNext} title="Next (Enter)" autoFocus>
            Next <Icon name="next" size={16} />
          </button>
        )}
      </div>
      <div className="mt-2 min-h-5 text-[15px]">
        {quiz.phase === 'asking' && <span className="text-white/60">{hint ?? 'Spin the globe and tap the country.'}</span>}
        {last?.correct && (
          <span className="flex items-center gap-1.5 font-bold text-[var(--color-ok)]">
            <Icon name="check" size={18} /> Correct!
          </span>
        )}
        {last && !last.correct && (
          <span className="block min-w-0">
            <span className="mr-2 font-bold text-[var(--color-bad)]">Not quite.</span>
            <span className="text-white/75">{guess ? `That’s ${guess.name}. ` : 'Skipped. '}The right one is in green.</span>
          </span>
        )}
      </div>
    </GameCard>
  );
}
