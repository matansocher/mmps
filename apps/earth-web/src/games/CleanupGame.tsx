import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { Icon } from '../components/Icon';
import { TargetBoard } from '../components/QuizCard';
import { RoundSummary } from '../components/RoundSummary';
import { Stamps, useStamps } from '../components/Stamps';
import { cleanupTarget, type CleanupState, createCleanup, giveUp, guessCountry, isCleanupFinished, isOnMap } from '../game/cleanup';
import { bestScoreKey, type Continent, CONTINENT_VIEWS, modeTitle, questionPool } from '../game/modes';
import { flyToView } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { useRoundOutcome } from '../store/progress';
import { drawLeg, flightCode, useContinentOf } from './flight';
import { focusCountry } from './focus';
import type { GameProps } from './types';

const FLASH_MS = 900;

function Coverage({ state }: { readonly state: CleanupState }) {
  const total = state.order.length;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div
      className="flex h-2.5 overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-label={`${state.found.length} found, ${state.missed.length} missed, ${total - state.index} to go`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={state.index}
    >
      <div className="h-full bg-[var(--color-ok)] transition-[width] duration-500" style={{ width: pct(state.found.length) }} />
      <div className="h-full bg-[var(--color-bad)] transition-[width] duration-500" style={{ width: pct(state.missed.length) }} />
    </div>
  );
}

export function CleanupGame({ engine, mode, onChangeMode }: GameProps<{ readonly kind: 'cleanup'; readonly continent: Continent }>) {
  const { viewer, countries, layer, route } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode).map((c) => c.code), [countries, mode]);
  const [state, setState] = useState<CleanupState>(() => createCleanup(pool));
  const [flash, setFlash] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const { stamps, stamp } = useStamps();
  const continentOf = useContinentOf(engine);
  const done = isCleanupFinished(state);
  const target = cleanupTarget(state);

  const { hover, hint, setHint } = useGlobePointer(engine, !done, (country, at) => {
    if (isOnMap(state, country.code)) {
      setHint(`${country.name} is already on the map.`);
      return;
    }
    const correct = country.code === target;
    stamp(at.x, at.y, correct, country.name);
    if (correct) drawLeg(engine, state.found.at(-1), country.code);
    else setFlash(country.code);
    setState((s) => guessCountry(s, country.code));
  });

  const outcome = useRoundOutcome(done ? state : null, () => ({ kind: mode.kind, score: state.found.length, outOf: state.order.length, found: state.found }), continentOf);

  const startView = CONTINENT_VIEWS[mode.continent];
  useEffect(() => void flyToView(viewer, startView, 1.5), [viewer, startView]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // Show where a missed country was, so the next round goes better.
  useEffect(() => {
    if (state.last?.kind === 'revealed') focusCountry(engine, state.last.code);
  }, [state.last, engine]);

  // The continent fills in as the player goes; colors are derived from state only.
  useEffect(() => {
    layer.resetColors();
    state.found.forEach((code) => layer.setColor(code, COLORS.correct));
    state.missed.forEach((code) => layer.setColor(code, COLORS.missed));
    if (flash) layer.setColor(flash, COLORS.wrong);
    else if (hover && !done && !isOnMap(state, hover)) layer.setColor(hover, COLORS.hover);
    if (done && review) layer.setColor(review, COLORS.review);
  }, [layer, state, flash, hover, done, review]);

  useEffect(() => {
    if (done) setNewBest(record(state.found.length));
  }, [done, state, record]);

  const goGiveUp = useCallback(() => setState(giveUp), []);
  const playAgain = useCallback(() => {
    setReview(null);
    setNewBest(false);
    route.clear();
    setState(createCleanup(pool));
    void flyToView(viewer, startView, 1.5);
  }, [pool, route, viewer, startView]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useKeyboard({
    Enter: () => done && playAgain(),
    s: () => goGiveUp(),
    m: () => onChangeMode(),
  });

  const title = modeTitle(mode);

  if (done) {
    const items = state.order.map((code) => ({ code, correct: state.found.includes(code), note: state.found.includes(code) ? undefined : 'missed' }));
    return (
      <RoundSummary
        title={title}
        flight={flightCode(mode)}
        score={state.found.length}
        outOf={state.order.length}
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

  const { last } = state;
  const name = (code: string | null) => (code ? (countries.byCode.get(code)?.name ?? code) : '');

  return (
    <>
      <GameCard title={title} status={`· ${state.index + 1}/${state.order.length}`} aside={`Found ${state.found.length}`} onChangeMode={onChangeMode}>
        <Coverage state={state} />
        <div className="mt-3 flex items-center gap-3">
          <TargetBoard key={state.index} country={target ? countries.byCode.get(target) : undefined} />
          <button type="button" className="btn shrink-0" onClick={goGiveUp} title="Give up on this one (S)">
            Give up
          </button>
        </div>
        <div className="mt-2 min-h-5 text-[15px]">
          {hint ? (
            <span className="text-white/60">{hint}</span>
          ) : last?.kind === 'found' ? (
            <span className="flex items-center gap-1.5 font-bold text-[var(--color-ok)]">
              <Icon name="check" size={18} /> {name(last.code)} is on the map
            </span>
          ) : last?.kind === 'revealed' ? (
            <span className="text-white/75">{name(last.code)} was here, marked in red.</span>
          ) : (
            <span className="text-white/60">Find them all. One miss marks the country, and every find stays on the map.</span>
          )}
        </div>
      </GameCard>
      <Stamps stamps={stamps} />
    </>
  );
}
