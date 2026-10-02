import type { QuizState } from '../game/quiz';
import { lastAnswer, score } from '../game/quiz';
import { countryLabel } from '../lib/format';
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

function ProgressDots({ quiz }: { readonly quiz: QuizState }) {
  return (
    <ol className="flex gap-1.5" aria-label="Progress">
      {quiz.questions.map((code, i) => {
        const result = quiz.answers[i];
        const tone = result ? (result.correct ? 'bg-[#34a853]' : 'bg-[#ea4335]') : i === quiz.index ? 'bg-white' : 'bg-white/20';
        return <li key={code} className={`h-1.5 flex-1 rounded-full ${tone}`} />;
      })}
    </ol>
  );
}

export function QuizCard({ title, quiz, byCode, hint, onSkip, onNext, onChangeMode }: Props) {
  const target = byCode.get(quiz.questions[quiz.index]);
  const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
  const guess = last?.guess ? byCode.get(last.guess) : undefined;

  return (
    <GameCard title={title} status={`Question ${quiz.index + 1} of ${quiz.questions.length}`} aside={`Score ${score(quiz)}`} onChangeMode={onChangeMode}>
      <ProgressDots quiz={quiz} />

      {quiz.phase === 'asking' && (
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">Find</div>
            <div className="truncate text-2xl font-semibold">{countryLabel(target)}</div>
          </div>
          <button type="button" className="chip shrink-0" onClick={onSkip} title="Skip (S)">
            Skip
          </button>
        </div>
      )}
      {quiz.phase === 'asking' && hint && <div className="mt-1.5 text-sm text-white/60">{hint}</div>}

      {last && (
        <div className="mt-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {last.correct && (
              <div className="flex items-center gap-2 text-lg font-semibold text-[#5bd27a]">
                <Icon name="check" /> Correct! {countryLabel(target)}
              </div>
            )}
            {!last.correct && guess && (
              <>
                <div className="truncate text-lg font-semibold text-[#ff7b6e]">That’s {countryLabel(guess)}</div>
                <div className="truncate text-sm text-white/65">{target?.name} is shown in green</div>
              </>
            )}
            {!last.correct && !guess && (
              <>
                <div className="truncate text-lg font-semibold">Skipped</div>
                <div className="truncate text-sm text-white/65">{countryLabel(target)} is shown in green</div>
              </>
            )}
          </div>
          {!last.correct && (
            <button type="button" className="chip flex shrink-0 items-center gap-1" aria-pressed="true" onClick={onNext} title="Next (Enter)" autoFocus>
              Next <Icon name="next" size={16} />
            </button>
          )}
        </div>
      )}
    </GameCard>
  );
}
