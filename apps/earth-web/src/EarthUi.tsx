import { ScreenSpaceEventHandler, ScreenSpaceEventType } from 'cesium';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './components/Icon';
import { NavControls } from './components/NavControls';
import { HelpDialog } from './components/Overlays';
import { QuizCard } from './components/QuizCard';
import { RoundSummary } from './components/RoundSummary';
import { countryFocus, MIN_QUESTION_AREA_KM2 } from './game/countries';
import { answer, createQuiz, currentTarget, lastAnswer, next, type QuizState, score, skip } from './game/quiz';
import { flyToArea, flyToView, HOME_VIEW, nudge, resetNorth, zoomBy } from './globe/camera';
import type { EarthEngine } from './globe/engine';
import { pickLatLon } from './globe/pick';
import { useHeading } from './hooks/useHeading';
import { useKeyboard } from './hooks/useKeyboard';
import { readJson, writeJson } from './lib/storage';

const COLORS = { hover: '#c9dcf3', correct: '#34a853', wrong: '#ea4335', review: '#fbbc04' } as const;
const AUTO_ADVANCE_MS = 1200;
const HINT_MS = 2200;
const BEST_KEY = 'best';

const isScore = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export function EarthUi({ engine }: { readonly engine: EarthEngine }) {
  const { viewer, countries, layer } = engine;
  const pool = useMemo(() => countries.countries.filter((c) => c.area >= MIN_QUESTION_AREA_KM2).map((c) => c.code), [countries]);
  const [quiz, setQuiz] = useState<QuizState>(() => createQuiz(pool));
  const [hover, setHover] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [best, setBest] = useState(() => readJson(BEST_KEY, 0, isScore));
  const [newBest, setNewBest] = useState(false);
  const heading = useHeading(engine);

  const quizRef = useRef(quiz);
  useLayoutEffect(() => {
    quizRef.current = quiz;
  });

  const showCountry = useCallback(
    (code: string) => {
      const country = countries.byCode.get(code);
      if (!country) return;
      const { lat, lon, spanKm } = countryFocus(country);
      void flyToArea(viewer, lat, lon, spanKm);
    },
    [countries, viewer],
  );

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
    showCountry(last.target);
  }, [quiz, showCountry]);

  useEffect(() => {
    if (quiz.phase !== 'finished') return;
    const result = score(quiz);
    const previous = readJson(BEST_KEY, 0, isScore);
    setNewBest(result > previous);
    if (result > previous) {
      writeJson(BEST_KEY, result);
      setBest(result);
    }
  }, [quiz]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  useEffect(() => {
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ position }: ScreenSpaceEventHandler.PositionedEvent) => {
      if (quizRef.current.phase !== 'asking') return;
      const point = pickLatLon(viewer, position);
      const country = point ? countries.findAt(point) : null;
      if (!country) {
        setHint(point ? 'That’s water — try again.' : 'That’s space — try again.');
        return;
      }
      setHint(null);
      setHover(null);
      setQuiz((q) => answer(q, country.code));
    }, ScreenSpaceEventType.LEFT_CLICK);

    let frame = 0;
    handler.setInputAction(({ endPosition }: ScreenSpaceEventHandler.MotionEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const point = quizRef.current.phase === 'asking' ? pickLatLon(viewer, endPosition) : null;
        const code = point ? (countries.findAt(point)?.code ?? null) : null;
        viewer.scene.canvas.style.cursor = code ? 'pointer' : '';
        setHover(code);
      });
    }, ScreenSpaceEventType.MOUSE_MOVE);

    return () => {
      cancelAnimationFrame(frame);
      handler.destroy();
    };
  }, [viewer, countries]);

  const goNext = useCallback(() => setQuiz(next), []);
  const goSkip = useCallback(() => setQuiz(skip), []);
  const goHome = useCallback(() => void flyToView(viewer, HOME_VIEW, 1.5), [viewer]);
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    setQuiz(createQuiz(pool));
    goHome();
  }, [pool, goHome]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      showCountry(code);
    },
    [showCountry],
  );

  useKeyboard({
    Enter: () => (quizRef.current.phase === 'finished' ? playAgain() : goNext()),
    s: () => goSkip(),
    '+': () => zoomBy(viewer, 0.5),
    '=': () => zoomBy(viewer, 0.5),
    '-': () => zoomBy(viewer, 2),
    _: () => zoomBy(viewer, 2),
    ArrowLeft: () => nudge(viewer, 'left'),
    ArrowRight: () => nudge(viewer, 'right'),
    ArrowUp: () => nudge(viewer, 'up'),
    ArrowDown: () => nudge(viewer, 'down'),
    n: () => resetNorth(viewer),
    r: () => goHome(),
    '?': () => setHelp(true),
  });

  const target = currentTarget(quiz);

  return (
    <>
      {target && <QuizCard quiz={quiz} byCode={countries.byCode} hint={hint} onSkip={goSkip} onNext={goNext} />}
      {quiz.phase === 'finished' && <RoundSummary quiz={quiz} byCode={countries.byCode} best={best} newBest={newBest} onPlayAgain={playAgain} onShowCountry={reviewCountry} />}
      <NavControls heading={heading} onResetNorth={() => resetNorth(viewer)} onHome={goHome} onZoomIn={() => zoomBy(viewer, 0.5)} onZoomOut={() => zoomBy(viewer, 2)} />
      <button type="button" className="glass icon-btn fixed bottom-6 left-4 z-20 h-11 w-11 max-sm:left-3" aria-label="How to play" title="How to play (?)" onClick={() => setHelp(true)}>
        <Icon name="help" />
      </button>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </>
  );
}
