import { useCallback, useEffect, useMemo, useState } from 'react';
import { QuizCard } from '../components/QuizCard';
import { RoundSummary } from '../components/RoundSummary';
import { Stamps, useStamps } from '../components/Stamps';
import { bestScoreKey, type Continent, CONTINENT_VIEWS, modeTitle, questionPool } from '../game/modes';
import { dailyRandom } from '../game/progression';
import { answer, createQuiz, currentTarget, lastAnswer, next, type QuizState, ROUND_SIZE, score, skip } from '../game/quiz';
import { flyToView, HOME_VIEW } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRoundOutcome } from '../store/progress';
import { drawLeg, flightCode, useContinentOf } from './flight';
import { focusCountry } from './focus';
import type { GameProps } from './types';

const AUTO_ADVANCE_MS = 1200;

type ClassicMode = { readonly kind: 'classic' } | { readonly kind: 'continent'; readonly continent: Continent } | { readonly kind: 'daily'; readonly day: string };

export function ClassicGame({ engine, mode, onChangeMode }: GameProps<ClassicMode>) {
  const { viewer, countries, layer, route } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode).map((c) => c.code), [countries, mode]);
  const newQuiz = useCallback(() => (mode.kind === 'daily' ? createQuiz(pool, ROUND_SIZE, dailyRandom(mode.day)) : createQuiz(pool)), [pool, mode]);
  const [quiz, setQuiz] = useState<QuizState>(newQuiz);
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const { stamps, stamp } = useStamps();
  const continentOf = useContinentOf(engine);

  const { hover, hint } = useGlobePointer(engine, quiz.phase === 'asking', (country, at) => {
    const target = currentTarget(quiz);
    const correct = country.code === target;
    stamp(at.x, at.y, correct, country.name);
    if (correct) drawLeg(engine, quiz.answers.findLast((a) => a.correct)?.target, country.code);
    setQuiz((q) => answer(q, country.code));
  });

  const finished = quiz.phase === 'finished' ? quiz : null;
  const outcome = useRoundOutcome(
    finished,
    () => ({ kind: mode.kind, score: score(quiz), outOf: quiz.questions.length, found: quiz.answers.filter((a) => a.correct).map((a) => a.target) }),
    continentOf,
  );

  const startView = mode.kind === 'continent' ? CONTINENT_VIEWS[mode.continent] : HOME_VIEW;
  useEffect(() => void flyToView(viewer, startView, 1.5), [viewer, startView]);

  // Map colors are derived from the quiz state, so they can never drift from it.
  useEffect(() => {
    layer.resetColors();
    const last = quiz.phase === 'answered' ? lastAnswer(quiz) : null;
    if (last) {
      if (last.guess && !last.correct) layer.setColor(last.guess, COLORS.wrong);
      layer.setColor(last.target, COLORS.correct);
    } else if (quiz.phase === 'asking' && hover) {
      layer.setColor(hover, COLORS.hover);
    } else if (quiz.phase === 'finished' && review) {
      layer.setColor(review, COLORS.review);
    }
  }, [layer, quiz, hover, review]);

  useEffect(() => {
    if (quiz.phase !== 'answered') return;
    const last = lastAnswer(quiz);
    if (!last) return;
    if (last.correct) {
      const timer = window.setTimeout(() => setQuiz(next), AUTO_ADVANCE_MS);
      return () => window.clearTimeout(timer);
    }
    focusCountry(engine, last.target);
  }, [quiz, engine]);

  useEffect(() => {
    if (quiz.phase === 'finished') setNewBest(record(score(quiz)));
  }, [quiz, record]);

  const goNext = useCallback(() => setQuiz(next), []);
  const goSkip = useCallback(() => setQuiz(skip), []);
  const canReplay = mode.kind !== 'daily';
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    route.clear();
    setQuiz(newQuiz());
    void flyToView(viewer, startView, 1.5);
  }, [newQuiz, route, viewer, startView]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useKeyboard({
    Enter: () => (quiz.phase !== 'finished' ? goNext() : canReplay ? playAgain() : onChangeMode()),
    s: () => goSkip(),
    m: () => onChangeMode(),
  });

  const title = modeTitle(mode);

  if (quiz.phase === 'finished') {
    const items = quiz.answers.map(({ target, guess, correct }) => ({ code: target, correct, note: correct ? undefined : guess ? `picked ${countries.byCode.get(guess)?.name ?? guess}` : 'skipped' }));
    return (
      <RoundSummary
        title={title}
        flight={flightCode(mode)}
        score={score(quiz)}
        outOf={quiz.questions.length}
        best={best}
        newBest={newBest && mode.kind !== 'daily'}
        items={items}
        byCode={countries.byCode}
        outcome={outcome}
        onPlayAgain={canReplay ? playAgain : undefined}
        onChangeMode={onChangeMode}
        onShowCountry={reviewCountry}
      />
    );
  }
  return (
    <>
      {currentTarget(quiz) && <QuizCard title={title} quiz={quiz} byCode={countries.byCode} hint={hint} onSkip={goSkip} onNext={goNext} onChangeMode={onChangeMode} />}
      <Stamps stamps={stamps} />
    </>
  );
}
