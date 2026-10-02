import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { Icon } from '../components/Icon';
import { TargetBoard } from '../components/QuizCard';
import { RoundSummary } from '../components/RoundSummary';
import { Stamps, useStamps } from '../components/Stamps';
import { bestScoreKey, questionPool } from '../game/modes';
import { classifyGuess, createNeighbours, currentQuestion, giveUp, guess, isComplete, MAX_MISSES, maxScore, type NeighboursState, next, score } from '../game/neighbours';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRoundOutcome } from '../store/progress';
import { drawLeg, flightCode, useContinentOf } from './flight';
import { focusRegion } from './focus';
import type { GameProps } from './types';

type Feedback = { readonly good: boolean; readonly text: string };

export function NeighboursGame({ engine, mode, onChangeMode }: GameProps<{ readonly kind: 'neighbours' }>) {
  const { countries, layer, route } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode), [countries, mode]);
  const [game, setGame] = useState<NeighboursState>(() => createNeighbours(pool));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const question = currentQuestion(game);
  const shown = question ?? (review === null ? null : game.questions[review]);
  const nameOf = (code: string) => countries.byCode.get(code)?.name ?? code;

  const { stamps, stamp } = useStamps();
  const continentOf = useContinentOf(engine);
  const { hover, hint, setHint } = useGlobePointer(engine, game.phase === 'asking', (country, at) => {
    if (!question) return;
    const kind = classifyGuess(question, country.code);
    if (kind === 'center') setHint(`That’s ${country.name} itself — click the countries around it.`);
    if (kind === 'hit') {
      stamp(at.x, at.y, true, country.name);
      drawLeg(engine, question.center, country.code);
      setFeedback({ good: true, text: `✓ ${country.name}` });
    }
    if (kind === 'miss') {
      stamp(at.x, at.y, false, country.name);
      setFeedback({ good: false, text: `✗ ${country.name} doesn’t border ${nameOf(question.center)}` });
    }
    setGame((g) => guess(g, country.code));
  });

  useEffect(() => {
    if (shown) focusRegion(engine, [shown.center, ...shown.neighbours]);
  }, [engine, shown?.center]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    layer.resetColors();
    if (!shown) return;
    if (game.phase === 'asking' && hover && classifyGuess(shown, hover) !== 'center') layer.setColor(hover, COLORS.hover);
    if (game.phase !== 'asking') shown.neighbours.forEach((code) => layer.setColor(code, COLORS.revealed));
    shown.found.forEach((code) => layer.setColor(code, COLORS.correct));
    shown.misses.forEach((code) => layer.setColor(code, COLORS.wrong));
    layer.setColor(shown.center, COLORS.center);
  }, [layer, game.phase, shown, hover]);

  const outcome = useRoundOutcome(
    game.phase === 'finished' ? game : null,
    () => ({ kind: 'neighbours', score: score(game), outOf: maxScore(game), found: game.questions.flatMap((q) => q.found) }),
    continentOf,
  );

  useEffect(() => {
    if (game.phase === 'finished') setNewBest(record(score(game)));
  }, [game, record]);

  const goNext = useCallback(() => {
    setFeedback(null);
    route.clear();
    setGame(next);
  }, [route]);
  const goGiveUp = useCallback(() => setGame(giveUp), []);
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    setFeedback(null);
    route.clear();
    setGame(createNeighbours(pool));
  }, [pool, route]);

  useKeyboard({
    Enter: () => (game.phase === 'finished' ? playAgain() : game.phase === 'answered' && goNext()),
    s: () => goGiveUp(),
    m: () => onChangeMode(),
  });

  if (game.phase === 'finished') {
    const items = game.questions.map((q) => ({ code: q.center, correct: isComplete(q), note: `${q.found.length} / ${q.neighbours.length}` }));
    const showQuestion = (code: string) => setReview(game.questions.findIndex((q) => q.center === code));
    return <RoundSummary title="Neighbours" flight={flightCode(mode)} outcome={outcome} score={score(game)} outOf={maxScore(game)} best={best} newBest={newBest} items={items} byCode={countries.byCode} onPlayAgain={playAgain} onChangeMode={onChangeMode} onShowCountry={showQuestion} />;
  }
  if (!question) return null;

  const total = question.neighbours.length;
  const centerCountry = countries.byCode.get(question.center);

  return (
    <>
      <GameCard title="Neighbours" status={`· ${game.index + 1}/${game.questions.length}`} aside={`Score ${score(game)}`} onChangeMode={onChangeMode}>
        <div className="board-type mb-1.5 text-[15px] font-semibold text-white/60">Connecting flights from</div>
        <div className="flex items-center gap-3">
          <TargetBoard key={question.center} country={centerCountry} />
          {game.phase === 'asking' ? (
            <button type="button" className="btn shrink-0" onClick={goGiveUp} title="Give up (S)">
              Give up
            </button>
          ) : (
            <button type="button" className="btn btn-signage shrink-0" onClick={goNext} title="Next (Enter)" autoFocus>
              Next <Icon name="next" size={16} />
            </button>
          )}
        </div>
        <div className="mt-2.5 flex items-center gap-3 text-[15px] text-white/70">
          <span className="board-type text-[17px] tabular-nums">
            Found <span className="font-bold text-white">{question.found.length}</span>/{total}
          </span>
          <span className="flex items-center gap-1" aria-label={`${question.misses.length} of ${MAX_MISSES} misses used`}>
            {Array.from({ length: MAX_MISSES }, (_, i) => (
              <span key={i} className={`grid h-4 w-4 place-items-center rounded-[3px] text-[10px] font-bold ${i < question.misses.length ? 'bg-[var(--color-bad)] text-[var(--color-ink)]' : 'bg-white/10'}`}>
                {i < question.misses.length ? '✗' : ''}
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1 truncate text-right">
            {game.phase === 'asking' ? (
              <span className={hint ? 'text-white/60' : feedback?.good ? 'text-[var(--color-ok)]' : 'text-[var(--color-bad)]'}>{hint ?? feedback?.text ?? 'Tap every bordering country.'}</span>
            ) : isComplete(question) ? (
              <span className="font-bold text-[var(--color-ok)]">✓ All {total} found!</span>
            ) : (
              <span>Missed ones are in pale green</span>
            )}
          </span>
        </div>
      </GameCard>
      <Stamps stamps={stamps} />
    </>
  );
}
