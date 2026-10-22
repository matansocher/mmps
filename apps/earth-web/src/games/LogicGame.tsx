import { useCallback, useEffect, useMemo, useState } from 'react';
import { Feedback, useFeedback } from '../components/Feedback';
import { GameCard } from '../components/GameCard';
import { RoundSummary } from '../components/RoundSummary';
import { createLogic, guessLogic, type LogicState, logicScore, logicShareText, randomLogicDay, revealedClues } from '../game/logic';
import { bestScoreKey, type GameMode, LOGIC_DIFFICULTY_LABELS } from '../game/modes';
import { flyToView, HOME_VIEW } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRoundOutcome } from '../store/progress';
import { generateLogicPuzzle, LOGIC_MAX_GUESSES, logicClueText } from '../../../../src/shared/worldly/logic-puzzle';
import { useContinentOf } from './continent';
import { focusCountry } from './focus';
import type { GameProps } from './types';

type LogicMode = Extract<GameMode, { readonly kind: 'logic' }>;

const SHARED_MS = 1800;

async function share(text: string): Promise<boolean> {
  try {
    if (navigator.share) await navigator.share({ text });
    else await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function LogicGame({ engine, mode, onChangeMode }: GameProps<LogicMode>) {
  const { viewer, countries, layer } = engine;
  const [day, setDay] = useState(mode.day);
  const puzzle = useMemo(() => generateLogicPuzzle(day, countries.countries, mode.difficulty), [day, countries, mode.difficulty]);
  const [state, setState] = useState<LogicState>(() => createLogic(puzzle));
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [shared, setShared] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const { marks, show } = useFeedback();
  const continentOf = useContinentOf(engine);
  const nameOf = useCallback((code: string) => countries.byCode.get(code)?.name ?? code, [countries]);
  const playing = state.phase === 'playing';

  const { hover, hint } = useGlobePointer(engine, playing, (country, at) => {
    if (state.guesses.includes(country.code)) return;
    const next = guessLogic(state, country.code);
    show(at.x, at.y, country.code === puzzle.answer, country.name);
    setState(next);
  });

  const finished = playing ? null : state;
  const outcome = useRoundOutcome(finished, () => ({ kind: mode.kind, score: logicScore(state), outOf: LOGIC_MAX_GUESSES, found: state.phase === 'won' ? [puzzle.answer] : [] }), continentOf);

  useEffect(() => void flyToView(viewer, HOME_VIEW, 1.5), [viewer]);

  useEffect(() => {
    layer.resetColors();
    for (const code of state.guesses) if (code !== puzzle.answer) layer.setColor(code, COLORS.wrong);
    if (!playing) layer.setColor(puzzle.answer, COLORS.correct);
    if (playing && hover && !state.guesses.includes(hover)) layer.setColor(hover, COLORS.hover);
    if (!playing && review && review !== puzzle.answer) layer.setColor(review, COLORS.review);
  }, [layer, state, puzzle, playing, hover, review]);

  useEffect(() => {
    if (playing) return;
    focusCountry(engine, puzzle.answer);
    setNewBest(record(logicScore(state)));
  }, [playing, engine, puzzle, record, state]);

  useEffect(() => {
    if (!shared) return;
    const timer = window.setTimeout(() => setShared(false), SHARED_MS);
    return () => window.clearTimeout(timer);
  }, [shared]);

  const onShare = useCallback(async () => setShared(await share(logicShareText(state))), [state]);
  const playAgain = useCallback(() => {
    const nextDay = randomLogicDay();
    setReview(null);
    setNewBest(false);
    setShared(false);
    setDay(nextDay);
    setState(createLogic(generateLogicPuzzle(nextDay, countries.countries, mode.difficulty)));
    void flyToView(viewer, HOME_VIEW, 1.5);
  }, [countries, viewer, mode.difficulty]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useKeyboard({ Enter: () => !playing && playAgain(), m: () => !playing && onChangeMode() });

  const title = `Earth Logic #${puzzle.number} · ${LOGIC_DIFFICULTY_LABELS[mode.difficulty]}`;
  const clues = revealedClues(state);
  const clueList = (
    <ol className="flex flex-col gap-1.5" aria-label="Clues">
      {clues.map((clue, i) => (
        <li key={i} className="animate-rise flex gap-2.5 text-[15px] leading-snug">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-accent)]/25 text-[12px] font-bold text-[var(--color-accent-soft)]">{i + 1}</span>
          <span>{logicClueText(clue, 'en', nameOf)}</span>
        </li>
      ))}
    </ol>
  );

  if (!playing) {
    const items = state.guesses.map((code, i) => ({ code, correct: code === puzzle.answer, note: `guess ${i + 1}` }));
    if (state.phase === 'lost') items.push({ code: puzzle.answer, correct: true, note: 'the answer' });
    return (
      <RoundSummary
        title={title}
        score={logicScore(state)}
        outOf={LOGIC_MAX_GUESSES}
        best={best}
        newBest={newBest}
        items={items}
        byCode={countries.byCode}
        outcome={outcome}
        onPlayAgain={playAgain}
        onChangeMode={onChangeMode}
        onShowCountry={reviewCountry}
        actions={
          <button type="button" className="btn" onClick={onShare}>
            {shared ? 'Copied!' : 'Share'}
          </button>
        }
      >
        <div className="mt-4 px-5">
          <p className="mb-2 text-[14px] font-bold text-white/75">
            {state.phase === 'won' ? `Solved in ${state.guesses.length}. ` : 'Not this time. '}
            The answer was {countries.byCode.get(puzzle.answer)?.flag} {nameOf(puzzle.answer)}.
          </p>
          {clueList}
        </div>
      </RoundSummary>
    );
  }

  const left = LOGIC_MAX_GUESSES - state.guesses.length;
  return (
    <>
      <GameCard
        eyebrow={`${title} · Deduce`}
        progress={
          <ol className="flex gap-1" aria-label={`${state.guesses.length} of ${LOGIC_MAX_GUESSES} guesses used`}>
            {Array.from({ length: LOGIC_MAX_GUESSES }, (_, i) => (
              <li key={i} className={`h-1.5 flex-1 rounded-full ${i < state.guesses.length ? 'bg-[var(--color-bad)]' : 'bg-white/15'}`} />
            ))}
          </ol>
        }
        count={`${left} left`}
        aside={`${clues.length}/${puzzle.clues.length} clues`}
        leaveGuard={state.guesses.length > 0 ? { detail: `You’ve used ${state.guesses.length} of ${LOGIC_MAX_GUESSES} guesses.` } : null}
        onChangeMode={onChangeMode}
      >
        {clueList}
        <div className="mt-2.5 min-h-5 text-[14px] text-white/75">{hint ?? (state.guesses.length ? `Not ${nameOf(state.guesses.at(-1) ?? '')}. Here’s another clue.` : 'Which country is it? Tap it on the globe.')}</div>
      </GameCard>
      <Feedback marks={marks} />
    </>
  );
}
