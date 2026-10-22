import type { QuizState } from '../game/quiz';
import { lastAnswer, score } from '../game/quiz';
import type { Country } from '../types';
import { GameCard } from './GameCard';
import { Icon } from './Icon';

type Props = {
  readonly title: string;
  readonly daily?: boolean;
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
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--color-tile)] text-[28px]" aria-hidden="true">
        {country.flag}
      </span>
      <span className="min-w-0 truncate text-[26px] leading-tight font-bold sm:text-[30px]">{country.name}</span>
    </div>
  );
}

const joinNames = (names: readonly string[]) => (names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

// "in South America, next to Peru and Brazil" — enough to remember it next time.
export function whereIs(country: Country, byCode: ReadonlyMap<string, Country>): string {
  const neighbours = country.neighbours
    .map((code) => byCode.get(code))
    .filter((c): c is Country => !!c)
    .sort((a, b) => b.area - a.area)
    .slice(0, 2)
    .map((c) => c.name);
  return neighbours.length ? `in ${country.continent}, next to ${joinNames(neighbours)}` : `in ${country.continent}`;
}

export function QuizCard({ title, daily, quiz, byCode, hint, onSkip, onNext, onChangeMode }: Props) {
  const target = byCode.get(quiz.questions[quiz.index]);
  const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
  const guess = last?.guess ? byCode.get(last.guess) : undefined;
  const missed = !!last && !last.correct;
  const total = quiz.questions.length;
  const leaveGuard = quiz.answers.length > 0 ? { detail: `You’re on ${Math.min(quiz.index + 1, total)}/${total}.`, daily } : null;

  return (
    <GameCard eyebrow={`${title} · Find`} progress={<Progress quiz={quiz} />} count={`${quiz.index + 1}/${total}`} aside={`★ ${score(quiz)}`} leaveGuard={leaveGuard} onChangeMode={onChangeMode}>
      <div className="mt-1.5 flex items-center gap-3">
        <Target key={quiz.index} country={target} />
        {quiz.phase === 'asking' && (
          <button type="button" className="btn shrink-0" onClick={onSkip} title="Skip (S)">
            Skip
          </button>
        )}
      </div>
      <div className="mt-2 min-h-5 text-[15px]">
        {quiz.phase === 'asking' && <span className="text-white/75">{hint ?? 'Spin the globe and tap the country.'}</span>}
        {last?.correct && (
          <span className="flex items-center gap-1.5 font-bold text-[var(--color-ok)]">
            <Icon name="check" size={18} /> Correct!
          </span>
        )}
        {missed && target && (
          <div className="min-w-0">
            <p className="text-white/75">{guess ? `You picked ${guess.name}.` : 'Skipped.'}</p>
            <p className="mt-0.5 font-bold text-white">
              It’s {target.name}, {whereIs(target, byCode)}.
            </p>
            <button type="button" className="btn btn-primary mt-3 w-full" onClick={onNext} title="Next (Enter)" autoFocus>
              Next <Icon name="next" size={16} />
            </button>
          </div>
        )}
      </div>
    </GameCard>
  );
}
