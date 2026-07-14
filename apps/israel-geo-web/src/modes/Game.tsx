import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { GuessMap } from '../components/GuessMap';
import { RoundResultMap } from '../components/RoundResultMap';
import { StreetViewRound } from '../components/StreetViewRound';
import { createDailySession, createSession, getProfile, submitGuess } from '../lib/api';
import { track } from '../lib/analytics';
import { formatDistance, scoreLabel } from '../lib/format';
import { resolveEquippedCosmetics } from '../lib/cosmetics';
import { shareResultCard } from '../lib/share-card';
import type { Coordinates, DailyGameSession, EquippedCosmetics, GameSession, PlayerProfile, Progression, RoundResult } from '../types';

type GameMode = 'normal' | 'daily';
type GamePhase = 'loading' | 'explore' | 'guess' | 'result' | 'complete' | 'error';

type GameProps = {
  readonly mode?: GameMode;
};

export function Game({ mode = 'normal' }: GameProps) {
  const [, navigate] = useLocation();
  const startedRef = useRef(false);
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [session, setSession] = useState<GameSession | DailyGameSession>();
  const [round, setRound] = useState(1);
  const [panoramaId, setPanoramaId] = useState('');
  const [results, setResults] = useState<readonly RoundResult[]>([]);
  const [currentResult, setCurrentResult] = useState<RoundResult>();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [gameCosmetics, setGameCosmetics] = useState<EquippedCosmetics>({});
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [latestProfile, setLatestProfile] = useState<PlayerProfile>();
  const [earnedStampLocalities, setEarnedStampLocalities] = useState<readonly string[]>([]);
  const [unlockedCosmeticIds, setUnlockedCosmeticIds] = useState<readonly string[]>([]);

  const isDailyPractice = session && 'practice' in session ? (session as DailyGameSession).practice : false;

  const startGame = useCallback(async (): Promise<void> => {
    setPhase('loading');
    setError('');
    try {
      const [profile, created] = await Promise.all([getProfile(), mode === 'daily' ? createDailySession() : createSession()]);
      setSession(created);
      setRound(created.round);
      setPanoramaId(created.panoramaId);
      setResults([]);
      setCurrentResult(undefined);
      setShareStatus('');
      setTotalCoinsEarned(0);
      setLatestProfile(profile);
      setEarnedStampLocalities([]);
      setUnlockedCosmeticIds([]);
      setGameCosmetics(resolveEquippedCosmetics(profile.equippedCosmetics, created.previewCosmeticId ?? profile.previewCosmeticId));
      setPhase('explore');
      track('game_started', { mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start a game');
      setPhase('error');
    }
  }, [mode]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startGame();
  }, [startGame]);

  async function handleGuess(coordinates: Coordinates, radiusKm: number): Promise<void> {
    if (!session || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitGuess(session.sessionId, round, coordinates, radiusKm);
      const nextResults = [...results, result];
      setResults(nextResults);
      setCurrentResult(result);
      applyProgression(result.progression);
      track('round_completed', { round, points: result.points, distanceMeters: result.distanceMeters, radiusKm: result.circleRadiusKm, circleHit: result.circleHit, mode });
      setPhase('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to score this guess');
      setPhase('error');
    } finally {
      setSubmitting(false);
    }
  }

  function applyProgression(prog: Progression | undefined): void {
    if (!prog) return;
    setLatestProfile(prog.player);
    setTotalCoinsEarned((prev) => prev + prog.coins.total);
    if (prog.newStamp) setEarnedStampLocalities((prev) => [...prev, prog.newStamp!]);
    if (prog.unlockedCosmeticIds.length > 0) setUnlockedCosmeticIds((prev) => [...prev, ...prog.unlockedCosmeticIds]);
  }

  function continueGame(): void {
    if (!currentResult) return;
    if (currentResult.completed) {
      setPhase('complete');
      return;
    }
    setRound((value) => value + 1);
    setPanoramaId(currentResult.nextPanoramaId!);
    setCurrentResult(undefined);
    setPhase('explore');
  }

  async function shareScore(): Promise<void> {
    const score = currentResult?.totalScore ?? 0;
    setShareStatus('Creating image...');
    try {
      const outcome = await shareResultCard({ score, results, newStampCount: earnedStampLocalities.length, shareFrameId: gameCosmetics['share-frame'] });
      setShareStatus(outcome === 'shared' ? 'Shared' : 'Image downloaded');
      track('shared', { score });
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') {
        setShareStatus('');
        return;
      }
      setShareStatus(err instanceof Error ? err.message : 'Could not create the share card');
    }
  }

  if (phase === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center bg-geo-night p-6 text-center">
        <div>
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-geo-line border-t-geo-orange" />
          <h1 className="mt-6 font-display text-3xl">{mode === 'daily' ? 'Loading today\'s route...' : 'Finding your first street...'}</h1>
          <p className="mt-2 text-geo-muted">The next location will load while you play.</p>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="grid min-h-dvh place-items-center bg-geo-night p-6">
        <div className="w-full max-w-md rounded-3xl border border-geo-line bg-geo-surface p-6 text-center">
          <h1 className="font-display text-3xl">We lost the road</h1>
          <p className="mt-3 text-geo-muted">{error}</p>
          <button
            type="button"
            onClick={() => void startGame()}
            className="mt-6 min-h-12 w-full rounded-2xl bg-geo-orange px-5 py-3 font-display text-xl focus:outline-none focus:ring-2 focus:ring-white"
          >
            Try again
          </button>
          <button type="button" onClick={() => navigate('/')} className="mt-3 min-h-11 w-full rounded-xl text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
            Back home
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'result' && currentResult) {
    const coinsThisRound = currentResult.progression?.coins.total ?? 0;
    const newStamp = currentResult.progression?.newStamp;
    return (
      <main className="min-h-dvh bg-geo-night px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className={`text-sm font-extrabold uppercase tracking-widest ${currentResult.circleHit ? 'text-green-500' : 'text-red-500'}`}>
                {currentResult.circleHit ? 'Circle hit' : 'Outside the circle'}
              </p>
              <h1 className="font-display text-4xl">{currentResult.locality}</h1>
            </div>
            <p className="font-display text-3xl text-geo-orange">+{currentResult.points.toLocaleString()}</p>
          </div>
          <RoundResultMap result={currentResult} mapThemeId={gameCosmetics['map-theme']} pinId={gameCosmetics.pin} />
          {newStamp ? (
            <div className="mt-4 rounded-2xl border border-geo-orange bg-geo-orange/10 p-4" role="status">
              <p className="text-xs font-extrabold uppercase tracking-wider text-geo-orange">New passport stamp</p>
              <p className="mt-1 font-display text-2xl">{newStamp}</p>
            </div>
          ) : null}
          {coinsThisRound > 0 ? (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4" role="status">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Compass Coins earned</p>
                <p className="mt-1 text-sm text-geo-muted">{currentResult.circleHit ? 'Circle hit' : 'Keep exploring'}</p>
              </div>
              <p className="font-display text-3xl text-amber-300">+{coinsThisRound}</p>
            </div>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">{currentResult.circleHit ? 'Circle radius' : 'Missed edge by'}</p>
              <p className="mt-1 font-display text-3xl">{currentResult.circleHit ? `${currentResult.circleRadiusKm} km` : formatDistance(currentResult.outsideDistanceMeters)}</p>
            </div>
            <div className="rounded-2xl border border-geo-line bg-geo-surface p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-geo-muted">Total</p>
              <p className="mt-1 font-display text-3xl">{currentResult.totalScore.toLocaleString()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={continueGame}
            className="mt-5 min-h-14 w-full rounded-2xl bg-geo-orange px-6 py-4 font-display text-2xl shadow-action transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {currentResult.completed ? 'See final score' : 'Next round'}
          </button>
        </div>
      </main>
    );
  }

  if (phase === 'complete' && currentResult) {
    const hasRewards = totalCoinsEarned > 0 || unlockedCosmeticIds.length > 0;
    return (
      <main className="min-h-dvh bg-geo-night px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(36px,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-lg">
          {mode === 'daily' && (
            <p className={`mb-3 rounded-xl px-4 py-2 text-center text-sm font-extrabold uppercase tracking-widest ${isDailyPractice ? 'bg-geo-elevated text-geo-muted' : 'bg-geo-blue/20 text-geo-blue'}`}>
              {isDailyPractice ? 'Practice run · no rewards' : '🏅 First attempt · rewards active'}
            </p>
          )}
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-geo-orange">Journey complete</p>
          <h1 className="mt-2 font-display text-6xl leading-none">{currentResult.totalScore.toLocaleString()}</h1>
          <p className="mt-2 font-display text-2xl text-geo-muted">out of 25,000</p>
          <p className="mt-5 text-xl font-bold">{scoreLabel(currentResult.totalScore)}</p>

          {hasRewards ? (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-7 rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5"
              aria-labelledby="coin-summary-heading"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-amber-300">Rewards earned</p>
                  <h2 id="coin-summary-heading" className="mt-1 font-display text-3xl">
                    Compass Coins
                  </h2>
                </div>
                <p className="font-display text-4xl text-amber-300">+{totalCoinsEarned}</p>
              </div>
              {latestProfile ? (
                <p className="mt-4 text-right text-sm font-bold text-amber-200">Wallet: {latestProfile.coins.toLocaleString()} coins</p>
              ) : null}
            </motion.section>
          ) : null}

          {unlockedCosmeticIds.length > 0 ? (
            <section className="mt-4 rounded-3xl border border-geo-orange bg-geo-orange/10 p-5" aria-labelledby="unlock-heading">
              <p className="text-xs font-extrabold uppercase tracking-wider text-geo-orange">Passport milestone</p>
              <h2 id="unlock-heading" className="mt-1 font-display text-2xl">
                Exclusive cosmetic unlocked
              </h2>
              <p className="mt-2 text-geo-muted">{unlockedCosmeticIds.join(', ')}</p>
            </section>
          ) : null}

          {earnedStampLocalities.length > 0 ? (
            <section className="mt-4 rounded-2xl border border-geo-orange/50 bg-geo-orange/5 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-geo-orange">New passport stamps</p>
              <p className="mt-1 font-display text-xl">{earnedStampLocalities.join(', ')}</p>
            </section>
          ) : null}

          <div className="mt-7 space-y-3">
            {results.map((result) => (
              <div key={result.round} className="flex items-center justify-between rounded-2xl border border-geo-line bg-geo-surface p-4">
                <div>
                  <p className="font-bold">
                    Round {result.round}: {result.locality}
                  </p>
                  <p className="text-sm text-geo-muted">
                    {result.circleHit ? `Hit with a ${result.circleRadiusKm} km circle` : `${formatDistance(result.outsideDistanceMeters)} outside a ${result.circleRadiusKm} km circle`}
                  </p>
                </div>
                <p className="font-display text-2xl text-geo-orange">{result.points.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void startGame()}
            className="mt-6 min-h-14 w-full rounded-2xl bg-geo-orange px-6 py-4 font-display text-2xl shadow-action focus:outline-none focus:ring-2 focus:ring-white"
          >
            {mode === 'daily' ? 'Practice again' : 'Play again'}
          </button>
          <button
            type="button"
            onClick={() => void shareScore()}
            disabled={shareStatus === 'Creating image...'}
            className="mt-3 min-h-12 w-full rounded-2xl border border-geo-line bg-geo-surface px-5 py-3 font-bold focus:outline-none focus:ring-2 focus:ring-geo-orange disabled:cursor-not-allowed disabled:opacity-50"
          >
            {shareStatus || 'Create & share result card'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/passport')}
            className="mt-3 min-h-12 w-full rounded-2xl border border-geo-line px-5 py-3 font-bold text-geo-orange focus:outline-none focus:ring-2 focus:ring-geo-orange"
          >
            Open Israel Passport
          </button>
          <button
            type="button"
            onClick={() => navigate('/rewards')}
            className="mt-3 min-h-12 w-full rounded-2xl border border-amber-400/40 px-5 py-3 font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            Spend Compass Coins
          </button>
          <button type="button" onClick={() => navigate('/')} className="mt-3 min-h-11 w-full text-geo-muted focus:outline-none focus:ring-2 focus:ring-geo-orange">
            Back home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh min-h-dvh flex-col overflow-hidden bg-geo-night">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/75 to-transparent px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
        <button type="button" onClick={() => navigate('/')} className="min-h-11 rounded-xl bg-black/40 px-4 font-bold backdrop-blur focus:outline-none focus:ring-2 focus:ring-white">
          Exit
        </button>
        <div className="rounded-xl bg-black/50 px-4 py-2 text-center backdrop-blur">
          {mode === 'daily' && (
            <p className={`text-xs font-extrabold uppercase tracking-widest ${isDailyPractice ? 'text-geo-muted' : 'text-geo-blue'}`}>
              {isDailyPractice ? 'Practice' : '🏅 Daily'}
            </p>
          )}
          <p className="text-xs font-extrabold uppercase tracking-widest text-geo-muted">Round</p>
          <p className="font-display text-xl">
            {round} / {session?.totalRounds ?? 5}
          </p>
        </div>
        <div className="min-w-20 rounded-xl bg-black/50 px-3 py-2 text-right backdrop-blur">
          <p className="text-xs font-extrabold uppercase tracking-widest text-geo-muted">Score</p>
          <p className="font-display text-xl">{results.reduce((total, result) => total + result.points, 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <StreetViewRound panoramaId={panoramaId} />
      </div>
      <div className="safe-b absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/85 to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-12">
        <button
          type="button"
          onClick={() => setPhase('guess')}
          className="min-h-14 w-full rounded-2xl bg-geo-orange px-6 py-4 font-display text-2xl shadow-action transition hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-white active:scale-[0.98]"
        >
          Make a guess
        </button>
      </div>

      <AnimatePresence>
        {phase === 'guess' ? (
          <motion.div key="guess" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GuessMap
              onCancel={() => setPhase('explore')}
              onConfirm={(coordinates, radiusKm) => void handleGuess(coordinates, radiusKm)}
              submitting={submitting}
              mapThemeId={gameCosmetics['map-theme']}
              pinId={gameCosmetics.pin}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
