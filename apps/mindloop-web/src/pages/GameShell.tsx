import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '../lib/categories';
import { getGame } from '../lib/games';
import { pickNextGame } from '../lib/picker';
import { commitScore, getBestScore } from '../lib/storage';
import { recordPlay } from '../lib/history';
import { syncResult } from '../lib/player-sync';
import { playSound } from '../lib/sound';
import type { GameResult } from '../lib/types';
import { IntroScreen } from '../components/IntroScreen';
import { ResultsScreen } from '../components/ResultsScreen';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

type Phase = 'intro' | 'play' | 'results';

export function GameShell() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const game = getGame(gameId);

  const [phase, setPhase] = useState<Phase>('intro');
  const [result, setResult] = useState<GameResult | null>(null);
  const [best, setBest] = useState(() => (gameId ? getBestScore(gameId) : 0));
  const [isNewBest, setIsNewBest] = useState(false);
  // The coach's next pick, computed when a run finishes so the session chains.
  const [nextGame, setNextGame] = useState<ReturnType<typeof getGame>>(undefined);
  // Remount the game component on replay so all internal state resets.
  const [runKey, setRunKey] = useState(0);

  const category = game ? CATEGORIES[game.category] : CATEGORIES.memory;

  // Chained navigation (Up next) only changes the route param, so reset the
  // whole flow back to the intro when the game id changes.
  useEffect(() => {
    setPhase('intro');
    setResult(null);
    setBest(gameId ? getBestScore(gameId) : 0);
    setIsNewBest(false);
    setNextGame(undefined);
    setRunKey((k) => k + 1);
  }, [gameId]);

  const handleFinish = useCallback(
    (r: GameResult) => {
      if (!game) return;
      const prev = getBestScore(game.id);
      const newBest = commitScore(game.id, r.score);
      recordPlay(game.id, r.score);
      syncResult(game.id, r.score);
      playSound('gameover');
      setResult(r);
      setBest(newBest);
      setIsNewBest(r.score > prev && r.score > 0);
      // Pick after recording so the just-played game is weighted correctly.
      setNextGame(pickNextGame({ exclude: game.id }));
      setPhase('results');
    },
    [game],
  );

  const startPlay = useCallback(() => {
    playSound('start');
    setRunKey((k) => k + 1);
    setPhase('play');
  }, []);

  const goHome = useCallback(() => navigate('/'), [navigate]);

  const goNext = useCallback(() => {
    if (!nextGame) return;
    playSound('start');
    navigate(`/game/${nextGame.id}`);
  }, [navigate, nextGame]);

  const GameComponent = useMemo(() => game?.component, [game]);

  if (!game || !GameComponent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="text-5xl">🤔</div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Game not found</h1>
        <Button onClick={goHome}>Back to home</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-6 pt-4 sm:px-6">
      <header className="flex flex-none items-center justify-between">
        <button
          onClick={goHome}
          className="ml-tap flex items-center gap-1 rounded-xl px-2 py-1 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <span aria-hidden>←</span> Exit
        </button>
        <div className="text-sm font-extrabold" style={{ color: category.accent }}>
          {game.title}
        </div>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col">
        {phase === 'intro' && (
          <IntroScreen game={game} category={category} best={best} onStart={startPlay} />
        )}

        {phase === 'play' && (
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-slate-400 dark:text-slate-500">Loading…</div>
            }
          >
            <GameComponent key={runKey} onFinish={handleFinish} />
          </Suspense>
        )}

        {phase === 'results' && result && (
          <ResultsScreen
            category={category}
            result={result}
            best={best}
            isNewBest={isNewBest}
            onReplay={startPlay}
            onHome={goHome}
            nextGame={nextGame}
            onNext={goNext}
          />
        )}
      </main>
    </div>
  );
}
