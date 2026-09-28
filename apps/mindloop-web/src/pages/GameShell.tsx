import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Dialog } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { IntroScreen } from '../components/IntroScreen';
import { ResultsScreen } from '../components/ResultsScreen';
import { GameRuntimeContext } from '../hooks/useGameRuntime';
import { getAchievements } from '../lib/achievements';
import { track } from '../lib/analytics';
import { CATEGORIES } from '../lib/categories';
import { getGame } from '../lib/games';
import { getHistory, getTodayPlayCount, recordPlay } from '../lib/history';
import { syncResult } from '../lib/player-sync';
import { getProgress, localDay, readJson, scoreKey, SCORING_VERSION, writeJson } from '../lib/progress';
import type { RunMode, RunRecord } from '../lib/progress';
import { RunClock } from '../lib/run-clock';
import { avoidGame, gameUrl, nextSessionGame, validChallengeDay } from '../lib/session';
import { playSound } from '../lib/sound';
import { telegram } from '../lib/telegram';
import type { GameResult } from '../lib/types';
import { newId } from '../lib/utils';

type Phase = 'intro' | 'play' | 'results';
export function GameShell() {
  const { gameId } = useParams();
  const game = getGame(gameId);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mode: RunMode = params.get('mode') === 'practice' ? 'practice' : params.get('mode') === 'daily' && gameId === 'block-escape' ? 'daily' : 'classic';
  const day = validChallengeDay(params.get('day'));
  const loop = params.get('loop') === '1';
  const [phase, setPhase] = useState<Phase>(() => (mode === 'practice' || getHistory().some((r) => r.gameId === gameId) ? 'play' : 'intro'));
  const [paused, setPaused] = useState<'pause' | 'exit' | 'help' | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [finished, setFinished] = useState<{ result: GameResult; run: RunRecord; previous: RunRecord[]; best: number; first: boolean; newBest: boolean; awards: string[] } | null>(null);
  const allowExit = useRef(false);
  const blocker = useBlocker(() => phase === 'play' && !allowExit.current);
  const [clock, setClock] = useState(() => new RunClock());
  const completed = useRef(false);
  const firstInput = useRef(false);
  const trackedRun = useRef(-1);
  const runtime = useMemo(() => ({ clock, mode, day, practice: mode === 'practice' }), [clock, mode, day]);
  const category = game ? CATEGORIES[game.category] : CATEGORIES.memory;
  const pause = useCallback(
    (reason: 'pause' | 'exit' | 'help') => {
      clock.setPaused(true);
      setPaused(reason);
    },
    [clock],
  );
  useEffect(() => {
    if (blocker.state === 'blocked') pause('exit');
  }, [blocker.state, pause]);
  const exit = useCallback(() => (phase === 'play' ? pause('exit') : navigate('/')), [phase, pause, navigate]);
  useEffect(() => {
    const tg = telegram();
    tg?.BackButton?.show();
    tg?.BackButton?.onClick(exit);
    if (phase === 'play') tg?.enableClosingConfirmation?.();
    return () => {
      tg?.BackButton?.offClick(exit);
      tg?.BackButton?.hide();
      tg?.disableClosingConfirmation?.();
    };
  }, [exit, phase]);
  useEffect(() => {
    if (phase !== 'play') return;
    completed.current = false;
    firstInput.current = false;
    if (trackedRun.current !== runKey) {
      trackedRun.current = runKey;
      if (!readJson('mindloop:first-start', false)) {
        track('first_game_started', { gameId, mode });
        writeJson('mindloop:first-start', true);
      }
      track('game_started', { gameId, mode, loop });
    }
    let frame = 0;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null) clock.advance(Math.max(0, now - previous) * (mode === 'practice' ? 0.75 : 1));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const hidden = () => {
      if (document.hidden) {
        previous = null;
        pause('pause');
      }
    };
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('beforeunload', unload);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('beforeunload', unload);
    };
  }, [clock, phase, pause, gameId, mode, loop, runKey]);
  const start = () => {
    allowExit.current = false;
    playSound('start');
    setPaused(null);
    setClock(new RunClock());
    setRunKey((k) => k + 1);
    setPhase('play');
  };
  const finish = useCallback(
    async (result: GameResult) => {
      if (!game || completed.current) return;
      completed.current = true;
      const before = getProgress();
      const count = getTodayPlayCount();
      const run: RunRecord = {
        runId: newId(),
        gameId: game.id,
        score: result.score,
        at: new Date().toISOString(),
        day: localDay(),
        mode,
        version: SCORING_VERSION,
        variant: result.variant ?? (mode === 'daily' ? day : 'default'),
        durationMs: Math.round(clock.now()),
        stats: result.stats,
      };
      const previous = getHistory().filter((r) => scoreKey(r) === scoreKey(run));
      const oldBest = before.records[scoreKey(run)] ?? 0;
      await recordPlay(run);
      syncResult();
      const after = getProgress();
      const awards = getAchievements()
        .filter((a) => !before.awards[a.id] && after.awards[a.id])
        .map((a) => a.title);
      setFinished({ result, run, previous, best: after.records[scoreKey(run)] ?? result.score, first: !Object.hasOwn(before.records, scoreKey(run)), newBest: result.score > oldBest, awards });
      playSound('success');
      setPhase('results');
      setPaused(null);
      track('game_completed', { gameId: game.id, mode, score: result.score, durationMs: run.durationMs });
      if (count < 3 && getTodayPlayCount() >= 3) {
        track('goal_reached');
        track('daily_session_completed');
      }
    },
    [game, mode, day, clock],
  );
  const share = async () => {
    const url = new URL(`${import.meta.env.BASE_URL}game/block-escape`, location.origin);
    url.searchParams.set('mode', 'daily');
    url.searchParams.set('day', day);
    const text = `Mindloop daily escape · ${day}. Can you find a smoother escape?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mindloop', text, url: url.href });
      else {
        await navigator.clipboard.writeText(`${text} ${url.href}`);
        setShared(true);
      }
      track('challenge_shared', { day });
    } catch {
      /* A canceled share leaves the result available. */
    }
  };
  const [shared, setShared] = useState(false);
  if (!game)
    return (
      <main className="ml-page">
        <h1>Game not found</h1>
        <button className="ml-primary" onClick={() => navigate('/')}>
          Explore games
        </button>
      </main>
    );
  const Game = game.component;
  const next = getGame(nextSessionGame());
  return (
    <div className="ml-game-shell">
      <header className="ml-game-header">
        <button onClick={exit} className="ml-text-button">
          <Icon name="close" size={18} />
          Exit
        </button>
        <strong>
          {game.title}
          <small>{mode === 'daily' ? `Daily escape · ${day} UTC` : mode === 'practice' ? 'Gentle practice' : ''}</small>
        </strong>
        <div>
          {phase === 'play' && (
            <>
              <button className="ml-icon-button" aria-label="How to play" onClick={() => pause('help')}>
                <Icon name="help" />
              </button>
              <button className="ml-icon-button" aria-label="Pause game" onClick={() => pause('pause')}>
                <Icon name="pause" />
              </button>
            </>
          )}
        </div>
      </header>
      <main className="ml-game-main">
        {phase === 'intro' && (
          <IntroScreen
            game={game}
            category={category}
            best={0}
            onStart={start}
            onPractice={() => {
              navigate(gameUrl(game.id, 'practice'), { replace: true });
              start();
            }}
          />
        )}
        {phase === 'play' && (
          <GameRuntimeContext.Provider value={runtime}>
            <div
              className="ml-game-stage"
              style={{ visibility: paused ? 'hidden' : 'visible' }}
              inert={!!paused}
              onPointerDown={() => {
                if (!firstInput.current) {
                  firstInput.current = true;
                  track('first_input', { gameId, mode });
                }
              }}
              onKeyDown={() => {
                if (!firstInput.current) {
                  firstInput.current = true;
                  track('first_input', { gameId, mode });
                }
              }}
            >
              <Suspense fallback={<p role="status">Getting your game ready…</p>}>
                <Game key={runKey} onFinish={finish} />
              </Suspense>
            </div>
          </GameRuntimeContext.Provider>
        )}
        {phase === 'results' && finished && (
          <>
            <ResultsScreen
              game={game}
              {...finished}
              onReplay={() => {
                track('replay_clicked', { gameId, mode });
                start();
              }}
              onNext={() => {
                track('next_round_clicked');
                navigate(gameUrl(next?.id ?? 'grid-recall', 'classic', '&loop=1'));
              }}
              nextTitle={next?.title ?? 'Grid Recall'}
              loop={loop}
              onShare={() => void share()}
            />
            {shared && <p role="status">Challenge link copied.</p>}
            <button
              className="ml-text-button ml-less-like"
              onClick={() => {
                avoidGame(game.id);
                navigate('/');
              }}
            >
              Suggest this game less often
            </button>
          </>
        )}
      </main>
      {paused && (
        <Dialog
          title={paused === 'exit' ? 'Leave this round?' : paused === 'help' ? 'How to play' : 'A little breather'}
          onClose={() => {
            if (blocker.state === 'blocked') blocker.reset();
            clock.setPaused(false);
            setPaused(null);
          }}
        >
          {paused === 'help' ? (
            <ol>
              {game.howTo.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : (
            <p>{paused === 'exit' ? 'This unfinished round won’t count. Your completed rounds are safe.' : 'Your clock is stopped. Your board will return when you’re ready.'}</p>
          )}
          <button
            className="ml-primary"
            onClick={() => {
              if (blocker.state === 'blocked') blocker.reset();
              clock.setPaused(false);
              setPaused(null);
            }}
          >
            Resume game
            <Icon name="play" size={18} />
          </button>
          {paused === 'exit' && (
            <button
              className="ml-text-button"
              onClick={() => {
                track('game_abandoned', { gameId, mode, durationMs: Math.round(clock.now()) });
                allowExit.current = true;
                if (blocker.state === 'blocked') blocker.proceed();
                else navigate('/');
              }}
            >
              Leave round
            </button>
          )}
        </Dialog>
      )}
    </div>
  );
}
