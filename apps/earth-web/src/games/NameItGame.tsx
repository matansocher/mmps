import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useBottomSheet } from '../hooks/useBottomSheet';
import { useKeyboard } from '../hooks/useKeyboard';
import { haptic } from '../lib/telegram';
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
      const correct = code === target;
      if (correct) playCorrect();
      else playMiss();
      haptic(correct ? 'success' : 'error');
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
    m: () => quiz.phase === 'finished' && onChangeMode(),
  });

  const title = modeTitle(mode);
  const sheetRef = useRef<HTMLElement>(null);
  useBottomSheet(sheetRef, quiz.phase !== 'finished');

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
    if (!last) return 'border-white/10 bg-[var(--color-tile)] hover:border-[var(--color-accent)] hover:bg-white/10';
    if (code === last.target) return 'border-[var(--color-ok)] bg-[var(--color-ok)]/15';
    if (code === last.guess) return 'border-[var(--color-bad)] bg-[var(--color-bad)]/15';
    return 'border-white/10 bg-[var(--color-tile)] opacity-70';
  };
  const tag = (code: string) => {
    if (!last) return null;
    if (code === last.target) return { glyph: '✓', text: 'Correct', color: 'text-[var(--color-ok)]' };
    if (code === last.guess) return { glyph: '✗', text: 'Your pick', color: 'text-[var(--color-bad)]' };
    return null;
  };
  const answerName = last ? countries.byCode.get(last.target)?.name : undefined;
  const total = quiz.questions.length;

  return (
    <>
      <GameCard
        eyebrow={`${title} · Name it`}
        progress={<Progress quiz={quiz} />}
        count={`${quiz.index + 1}/${total}`}
        aside={`★ ${score(quiz)}`}
        leaveGuard={quiz.answers.length > 0 ? { detail: `You’re on ${quiz.index + 1}/${total}.` } : null}
        onChangeMode={onChangeMode}
      />
      <section
        ref={sheetRef}
        className="panel animate-rise fixed inset-x-0 bottom-0 z-20 rounded-t-[22px] border-b-0 px-3 pt-3 pb-[calc(12px+var(--safe-bottom))] sm:bottom-4 sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2 sm:rounded-[18px] sm:border-b sm:px-4 sm:pb-4"
        aria-label="Answers"
      >
        <div className="flex min-h-9 items-center gap-3 px-1" aria-live="polite">
          <p className="min-w-0 flex-1 text-[17px] font-bold sm:text-[19px]">
            {quiz.phase === 'asking' && 'Which country is highlighted?'}
            {last?.correct && (
              <span className="flex items-center gap-1.5 text-[var(--color-ok)]">
                <Icon name="check" size={18} /> Correct! It’s {answerName}.
              </span>
            )}
            {last && !last.correct && <span>It’s {answerName}.</span>}
          </p>
          {quiz.phase === 'asking' && (
            <button type="button" className="btn shrink-0" onClick={goSkip} title="Skip (S)">
              Skip
            </button>
          )}
        </div>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {choices.map((code, i) => {
            const country = countries.byCode.get(code);
            const t = tag(code);
            return (
              <li key={code}>
                <button
                  type="button"
                  disabled={quiz.phase !== 'asking'}
                  onClick={() => choose(code)}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-left text-[16px] font-bold transition-[background-color,border-color,opacity] duration-200 disabled:cursor-default ${tone(code)}`}
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-black/30 text-[13px] text-white/75" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="text-[20px]" aria-hidden="true">
                    {country?.flag}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{country?.name}</span>
                  {t && (
                    <span className={`flex shrink-0 items-center gap-1 text-[13px] ${t.color}`}>
                      <span aria-hidden="true">{t.glyph}</span> {t.text}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        {last && !last.correct && (
          <button type="button" className="btn btn-primary mt-2.5 w-full" onClick={goNext} title="Next (Enter)" autoFocus>
            Next <Icon name="next" size={16} />
          </button>
        )}
      </section>
    </>
  );
}
