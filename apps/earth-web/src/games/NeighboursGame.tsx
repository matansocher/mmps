import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { Icon } from '../components/Icon';
import { RoundSummary } from '../components/RoundSummary';
import { bestScoreKey, questionPool } from '../game/modes';
import { classifyGuess, createNeighbours, currentQuestion, giveUp, guess, isComplete, MAX_MISSES, maxScore, type NeighboursState, next, score } from '../game/neighbours';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { countryLabel } from '../lib/format';
import { focusRegion } from './focus';
import type { GameProps } from './types';

type Feedback = { readonly good: boolean; readonly text: string };

export function NeighboursGame({ engine, mode, onChangeMode }: GameProps<{ readonly kind: 'neighbours' }>) {
  const { countries, layer } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode), [countries, mode]);
  const [game, setGame] = useState<NeighboursState>(() => createNeighbours(pool));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const question = currentQuestion(game);
  const shown = question ?? (review === null ? null : game.questions[review]);
  const nameOf = (code: string) => countries.byCode.get(code)?.name ?? code;

  const { hover, hint, setHint } = useGlobePointer(engine, game.phase === 'asking', (country) => {
    if (!question) return;
    const kind = classifyGuess(question, country.code);
    if (kind === 'center') setHint(`That’s ${country.name} itself — click the countries around it.`);
    if (kind === 'hit') setFeedback({ good: true, text: `✓ ${country.name}` });
    if (kind === 'miss') setFeedback({ good: false, text: `✗ ${country.name} doesn’t border ${nameOf(question.center)}` });
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

  useEffect(() => {
    if (game.phase === 'finished') setNewBest(record(score(game)));
  }, [game, record]);

  const goNext = useCallback(() => {
    setFeedback(null);
    setGame(next);
  }, []);
  const goGiveUp = useCallback(() => setGame(giveUp), []);
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    setFeedback(null);
    setGame(createNeighbours(pool));
  }, [pool]);

  useKeyboard({
    Enter: () => (game.phase === 'finished' ? playAgain() : game.phase === 'answered' && goNext()),
    s: () => goGiveUp(),
    m: () => onChangeMode(),
  });

  if (game.phase === 'finished') {
    const items = game.questions.map((q) => ({ code: q.center, correct: isComplete(q), note: `${q.found.length} / ${q.neighbours.length}` }));
    const showQuestion = (code: string) => setReview(game.questions.findIndex((q) => q.center === code));
    return <RoundSummary heading="Neighbours · Round complete" score={score(game)} outOf={maxScore(game)} best={best} newBest={newBest} items={items} byCode={countries.byCode} onPlayAgain={playAgain} onChangeMode={onChangeMode} onShowCountry={showQuestion} />;
  }
  if (!question) return null;

  const total = question.neighbours.length;
  const center = countryLabel(countries.byCode.get(question.center));

  return (
    <GameCard title="Neighbours" status={`Question ${game.index + 1} of ${game.questions.length}`} aside={`Score ${score(game)}`} onChangeMode={onChangeMode}>
      {game.phase === 'asking' ? (
        <>
          <div className="text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">Click every country bordering</div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 truncate text-2xl font-semibold">{center}</div>
            <button type="button" className="chip shrink-0" onClick={goGiveUp} title="Give up (S)">
              Give up
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-white/70">
            <span className="tabular-nums">
              Found <span className="font-semibold text-white">{question.found.length}</span> of {total}
            </span>
            <span className="flex items-center gap-1" aria-label={`${question.misses.length} of ${MAX_MISSES} misses used`}>
              {Array.from({ length: MAX_MISSES }, (_, i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < question.misses.length ? 'bg-[#ea4335]' : 'bg-white/25'}`} />
              ))}
            </span>
          </div>
          {(hint || feedback) && <div className={`mt-1 truncate text-sm ${hint ? 'text-white/60' : feedback?.good ? 'text-[#5bd27a]' : 'text-[#ff7b6e]'}`}>{hint ?? feedback?.text}</div>}
        </>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {isComplete(question) ? (
              <div className="flex items-center gap-2 text-lg font-semibold text-[#5bd27a]">
                <Icon name="check" /> All {total} found!
              </div>
            ) : (
              <>
                <div className="truncate text-lg font-semibold">
                  Found {question.found.length} of {total}
                </div>
                <div className="truncate text-sm text-white/65">Missed neighbours are shown in light green</div>
              </>
            )}
          </div>
          <button type="button" className="chip flex shrink-0 items-center gap-1" aria-pressed="true" onClick={goNext} title="Next (Enter)" autoFocus>
            Next <Icon name="next" size={16} />
          </button>
        </div>
      )}
    </GameCard>
  );
}
