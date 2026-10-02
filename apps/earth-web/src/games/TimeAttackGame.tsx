import { useCallback, useEffect, useMemo, useState } from 'react';
import { GameCard } from '../components/GameCard';
import { RoundSummary } from '../components/RoundSummary';
import { bestScoreKey, questionPool } from '../game/modes';
import { answer, createTimeAttack, currentTarget, PENALTY_MS, score, tick, TIME_ATTACK_MS, type TimeAttackState, timeLeft } from '../game/time-attack';
import { flyToView, HOME_VIEW } from '../globe/camera';
import { COLORS } from '../globe/colors';
import { useBestScore } from '../hooks/useBestScore';
import { useGlobePointer } from '../hooks/useGlobePointer';
import { useKeyboard } from '../hooks/useKeyboard';
import { countryLabel, formatClock } from '../lib/format';
import { focusCountry } from './focus';
import type { GameProps } from './types';

const TICK_MS = 100;
const FLASH_MS = 900;
const LOW_TIME_MS = 10_000;

export function TimeAttackGame({ engine, mode, onChangeMode }: GameProps<{ readonly kind: 'time-attack' }>) {
  const { viewer, countries, layer } = engine;
  const pool = useMemo(() => questionPool(countries.countries, mode).map((c) => c.code), [countries, mode]);
  const [game, setGame] = useState<TimeAttackState>(() => createTimeAttack(pool, Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [newBest, setNewBest] = useState(false);
  const { best, record } = useBestScore(bestScoreKey(mode));
  const playing = game.phase === 'playing';

  const submit = useCallback((guess: string | null) => {
    setGame((g) => answer(g, guess, Date.now()));
    setFlash(true);
  }, []);
  const { hover, hint } = useGlobePointer(engine, playing, (country) => submit(country.code));

  useEffect(() => void flyToView(viewer, HOME_VIEW, 1.5), [viewer]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      setGame((g) => tick(g, t));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [flash, game.answers.length]);

  const last = game.answers.at(-1);

  useEffect(() => {
    layer.resetColors();
    if (playing && hover) layer.setColor(hover, COLORS.hover);
    if (playing && flash && last) {
      if (last.guess && !last.correct) layer.setColor(last.guess, COLORS.wrong);
      layer.setColor(last.target, COLORS.correct);
    }
    if (!playing && review) layer.setColor(review, COLORS.review);
  }, [layer, playing, hover, flash, last, review]);

  useEffect(() => {
    if (game.phase === 'finished') setNewBest(record(score(game)));
  }, [game, record]);

  const playAgain = useCallback(() => {
    const t = Date.now();
    setReview(null);
    setNewBest(false);
    setFlash(false);
    setNow(t);
    setGame(createTimeAttack(pool, t));
    void flyToView(viewer, HOME_VIEW, 1.5);
  }, [pool, viewer]);
  const reviewCountry = useCallback(
    (code: string) => {
      setReview(code);
      focusCountry(engine, code);
    },
    [engine],
  );

  useKeyboard({
    Enter: () => !playing && playAgain(),
    s: () => playing && submit(null),
    m: () => onChangeMode(),
  });

  if (!playing) {
    const items = game.answers.map(({ target, guess, correct }) => ({ code: target, correct, note: correct ? undefined : guess ? `picked ${countries.byCode.get(guess)?.name ?? guess}` : 'skipped' }));
    return <RoundSummary heading="Time Attack · Time’s up!" score={score(game)} best={best} newBest={newBest} items={items} byCode={countries.byCode} onPlayAgain={playAgain} onChangeMode={onChangeMode} onShowCountry={reviewCountry} />;
  }

  const left = timeLeft(game, now);
  const low = left <= LOW_TIME_MS;
  const target = countries.byCode.get(currentTarget(game) ?? '');
  const feedback = flash && last ? (last.correct ? { tone: 'text-[#5bd27a]', text: `✓ ${countryLabel(countries.byCode.get(last.target))}` } : { tone: 'text-[#ff7b6e]', text: `${last.guess ? `✗ That’s ${countries.byCode.get(last.guess)?.name}` : 'Skipped'} · −${PENALTY_MS / 1000} s` }) : null;

  return (
    <GameCard title="Time Attack" status={<span className={low ? 'font-semibold text-[#ff7b6e]' : 'text-white/80'}>{formatClock(left)} left</span>} aside={`Score ${score(game)}`} onChangeMode={onChangeMode}>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label="Time left" aria-valuemin={0} aria-valuemax={TIME_ATTACK_MS} aria-valuenow={Math.round(left)}>
        <div className={`h-full rounded-full transition-[width] duration-100 ease-linear ${low ? 'bg-[#ea4335]' : 'bg-white'}`} style={{ width: `${(left / TIME_ATTACK_MS) * 100}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium tracking-[0.14em] text-white/50 uppercase">Find</div>
          <div className="truncate text-2xl font-semibold">{countryLabel(target)}</div>
        </div>
        <button type="button" className="chip shrink-0" onClick={() => submit(null)} title={`Skip (S) · costs ${PENALTY_MS / 1000} s`}>
          Skip
        </button>
      </div>
      {(feedback || hint) && <div className={`mt-1.5 truncate text-sm ${feedback?.tone ?? 'text-white/60'}`}>{feedback?.text ?? hint}</div>}
    </GameCard>
  );
}
