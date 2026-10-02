import { useCallback, useEffect, useMemo, useState } from 'react';
import { QuizCard } from '../components/QuizCard';
import { RoundSummary } from '../components/RoundSummary';
import { bestScoreKey, type Continent, CONTINENT_VIEWS, modeTitle, questionPool } from '../game/modes';
import { answer, createQuiz, currentTarget, lastAnswer, next, type QuizState, score, skip } from '../game/quiz';
import { flyToView, HOME_VIEW } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { focusCountry } from './focus';
import type { GameProps } from './types';

const AUTO_ADVANCE_MS = 1200;

type ClassicMode = { readonly kind: 'classic' } | { readonly kind: 'continent'; readonly continent: Continent };

export function ClassicGame({ engine, mode, onChangeMode }: GameProps<ClassicMode>) {
  const { viewer, countries, layer } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode).map((c) => c.code), [countries, mode]);
  const [quiz, setQuiz] = useState<QuizState>(() => createQuiz(pool));
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const { hover, hint } = useGlobePointer(engine, quiz.phase === 'asking', (country) => setQuiz((q) => answer(q, country.code)));

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
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    setQuiz(createQuiz(pool));
    void flyToView(viewer, startView, 1.5);
  }, [pool, viewer, startView]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useKeyboard({
    Enter: () => (quiz.phase === 'finished' ? playAgain() : goNext()),
    s: () => goSkip(),
    m: () => onChangeMode(),
  });

  const title = modeTitle(mode);

  if (quiz.phase === 'finished') {
    const items = quiz.answers.map(({ target, guess, correct }) => ({ code: target, correct, note: correct ? undefined : guess ? `picked ${countries.byCode.get(guess)?.name ?? guess}` : 'skipped' }));
    return (
      <RoundSummary heading={`${title} · Round complete`} score={score(quiz)} outOf={quiz.questions.length} best={best} newBest={newBest} items={items} byCode={countries.byCode} onPlayAgain={playAgain} onChangeMode={onChangeMode} onShowCountry={reviewCountry} />
    );
  }
  return currentTarget(quiz) ? <QuizCard title={title} quiz={quiz} byCode={countries.byCode} hint={hint} onSkip={goSkip} onNext={goNext} onChangeMode={onChangeMode} /> : null;
}
