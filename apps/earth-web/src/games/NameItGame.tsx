import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { Icon } from '../components/Icon';
import { Progress } from '../components/QuizCard';
import { RoundSummary } from '../components/RoundSummary';
import { bestScoreKey, modeTitle, questionPool } from '../game/modes';
import { nameItOptions } from '../game/name-it';
import { answer, createQuiz, currentTarget, lastAnswer, next, type QuizState, score, skip } from '../game/quiz';
import { flyToView, HOME_VIEW } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRoundOutcome } from '../store/progress';
import { playCorrect, playMiss } from '../store/sound';
import { useContinentOf } from './continent';
import { focusCountry } from './focus';
import type { GameProps } from './types';

const AUTO_ADVANCE_MS = 1200;

type Round = {
  readonly quiz: QuizState;
  readonly options: readonly (readonly string[])[]; // per question, in display order
};

export function NameItGame({ engine, mode, onChangeMode }: GameProps<{ readonly kind: 'name-it' }>) {
  const { viewer, countries, layer } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode), [countries, mode]);
  const newRound = useCallback((): Round => {
    const quiz = createQuiz(pool.map((c) => c.code));
    return { quiz, options: quiz.questions.map((code) => nameItOptions(countries.byCode.get(code)!, pool)) };
  }, [pool, countries]);
  const [{ quiz, options }, setRound] = useState<Round>(newRound);
  const setQuiz = useCallback((update: (q: QuizState) => QuizState) => setRound((r) => ({ ...r, quiz: update(r.quiz) })), []);
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const continentOf = useContinentOf(engine);

  const target = currentTarget(quiz);
  const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
  const choices = quiz.phase === 'finished' ? [] : options[quiz.index];

  const finished = quiz.phase === 'finished' ? quiz : null;
  const outcome = useRoundOutcome(
    finished,
    () => ({ kind: mode.kind, score: score(quiz), outOf: quiz.questions.length, found: quiz.answers.filter((a) => a.correct).map((a) => a.target) }),
    continentOf,
  );

  // Fly to each new mystery country.
  useEffect(() => {
    if (target) focusCountry(engine, target);
  }, [engine, target]);

  useEffect(() => {
    layer.resetColors();
    if (quiz.phase === 'asking' && target) layer.setColor(target, COLORS.target);
    if (last) {
      if (last.guess && !last.correct) layer.setColor(last.guess, COLORS.wrong);
      layer.setColor(last.target, COLORS.correct);
    }
    if (quiz.phase === 'finished' && review) layer.setColor(review, COLORS.review);
  }, [layer, quiz, target, last, review]);

  useEffect(() => {
    if (!last?.correct) return;
    const timer = window.setTimeout(() => setQuiz(next), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [last, setQuiz]);

  useEffect(() => {
    if (quiz.phase === 'finished') setNewBest(record(score(quiz)));
  }, [quiz, record]);

  const choose = useCallback(
    (code: string) => {
      if (quiz.phase !== 'asking' || !target) return;
      if (code === target) playCorrect();
      else playMiss();
      setQuiz((q) => answer(q, code));
    },
    [quiz, target, setQuiz],
  );
  const goNext = useCallback(() => setQuiz(next), [setQuiz]);
  const goSkip = useCallback(() => setQuiz(skip), [setQuiz]);
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    setRound(newRound());
  }, [newRound]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useEffect(() => {
    if (quiz.phase === 'finished') void flyToView(viewer, HOME_VIEW, 1.5);
  }, [quiz.phase, viewer]);

  const pickKey = (i: number) => () => choices[i] && choose(choices[i]);
  useKeyboard({
    '1': pickKey(0),
    '2': pickKey(1),
    '3': pickKey(2),
    '4': pickKey(3),
    Enter: () => (quiz.phase === 'finished' ? playAgain() : quiz.phase === 'answered' && goNext()),
    s: () => goSkip(),
    m: () => onChangeMode(),
  });

  const title = modeTitle(mode);

  if (quiz.phase === 'finished') {
    const items = quiz.answers.map(({ target: code, guess, correct }) => ({ code, correct, note: correct ? undefined : guess ? `picked ${countries.byCode.get(guess)?.name ?? guess}` : 'skipped' }));
    return (
      <RoundSummary
        title={title}
        score={score(quiz)}
        outOf={quiz.questions.length}
        best={best}
        newBest={newBest}
        items={items}
        byCode={countries.byCode}
        outcome={outcome}
        onPlayAgain={playAgain}
        onChangeMode={onChangeMode}
        onShowCountry={reviewCountry}
      />
    );
  }

  const tone = (code: string) => {
    if (!last) return 'bg-[var(--color-tile)] hover:bg-white/15 hover:ring-2 hover:ring-[var(--color-accent)]';
    if (code === last.target) return last.correct ? 'bg-[var(--color-ok)] text-[var(--color-ink)]' : 'bg-[var(--color-ok)]/85 text-[var(--color-ink)]';
    if (code === last.guess) return 'bg-[var(--color-bad)] text-[var(--color-ink)]';
    return 'bg-[var(--color-tile)] opacity-45';
  };
  const guessed = last?.guess ? countries.byCode.get(last.guess) : undefined;
  const answerName = last ? countries.byCode.get(last.target)?.name : undefined;

  return (
    <GameCard title={title} status={`· ${quiz.index + 1}/${quiz.questions.length}`} aside={`Score ${score(quiz)}`} onChangeMode={onChangeMode}>
      <Progress quiz={quiz} />
      <p className="mt-3 text-[20px] font-bold sm:text-[24px]">
        Which country is <span className="rounded bg-[var(--color-accent)] px-1.5 text-white">lit up</span>?
      </p>
      <div className="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-label="Answers">
        {choices.map((code, i) => {
          const country = countries.byCode.get(code);
          return (
            <button
              key={code}
              type="button"
              disabled={quiz.phase !== 'asking'}
              onClick={() => choose(code)}
              className={`flex min-h-12 items-center gap-2 rounded-lg px-3 py-2 text-left text-[15px] font-semibold transition-[background-color,opacity,box-shadow] duration-200 disabled:cursor-default ${tone(code)}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/25 text-[13px] max-sm:hidden" aria-hidden="true">
                {i + 1}
              </span>
              <span aria-hidden="true">{country?.flag}</span>
              <span className="min-w-0 leading-tight">{country?.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex min-h-9 items-center gap-3 text-[15px]">
        <span className="min-w-0 flex-1">
          {quiz.phase === 'asking' && <span className="text-white/60">Spin to look around, then pick an answer<span className="max-sm:hidden"> or press 1–4</span>.</span>}
          {last?.correct && (
            <span className="flex items-center gap-1.5 font-bold text-[var(--color-ok)]">
              <Icon name="check" size={18} /> Correct!
            </span>
          )}
          {last && !last.correct && (
            <span className="text-white/75">
              <span className="mr-2 rounded bg-[var(--color-bad)] px-1.5 py-0.5 text-[14px] font-bold text-[var(--color-ink)]">✗ Not quite</span>
              {guessed ? `It’s ${answerName}. ${guessed.name} is in red.` : `It’s ${answerName}.`}
            </span>
          )}
        </span>
        {quiz.phase === 'asking' && (
          <button type="button" className="btn shrink-0" onClick={goSkip} title="Skip (S)">
            Skip
          </button>
        )}
        {last && !last.correct && (
          <button type="button" className="btn btn-primary shrink-0" onClick={goNext} title="Next (Enter)" autoFocus>
            Next <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </GameCard>
  );
}
