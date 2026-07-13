import { useCallback, useEffect, useRef, useState } from 'react';
import { CAUGHT_RESET_MS, GAME_TICK_MS } from '../game/game-loop';
import { directionForDelta, directionForKey } from '../game/input';
import { createGameState, elapsedMs, resetGame, stepGame, type Direction, type GameState, type ParsedFloor } from '../game';
import { directionForCanvasTap, renderGame } from '../game/renderer';
import { DirectionPad } from './DirectionPad';
import { playSound } from '../lib/audio';

type GameProps = {
  readonly floor: ParsedFloor;
  readonly floorNumber: number;
  readonly floorCount: number;
  readonly onComplete: (elapsed: number) => void;
  readonly onExit: () => void;
  readonly soundEnabled: boolean;
};

type PlayMode = 'briefing' | 'playing' | 'paused';

function formatTime(milliseconds: number): string {
  return `${(milliseconds / 1000).toFixed(1)}s`;
}

function awarenessLabel(suspicion: number): string {
  if (suspicion >= 70) return 'ALERT';
  if (suspicion > 0) return 'WATCHED';
  return 'CLEAR';
}

function interactionLabel(state: GameState): string | null {
  if (!state.interaction) return null;
  if (state.interaction.kind === 'keycard') return 'ACCESS CARD ACQUIRED';
  if (state.interaction.kind === 'vent') return 'VENT TRAVERSED';
  return 'ACCESS CARD REQUIRED';
}

export function Game({ floor, floorNumber, floorCount, onComplete, onExit, soundEnabled }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createGameState(floor));
  const previousStateRef = useRef<GameState>(stateRef.current);
  const directionRef = useRef<Direction | null>(null);
  const queuedDirectionRef = useRef<Direction | null>(null);
  const gestureStartRef = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const completionReportedRef = useRef(false);
  const [state, setState] = useState(stateRef.current);
  const [mode, setMode] = useState<PlayMode>('briefing');
  const [now, setNow] = useState(Date.now());

  const replaceState = useCallback((nextState: GameState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    completionReportedRef.current = false;
    directionRef.current = null;
    queuedDirectionRef.current = null;
    const nextState = createGameState(floor);
    previousStateRef.current = nextState;
    stateRef.current = nextState;
    setState(nextState);
    setMode('briefing');
  }, [floor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderGame(canvas, state, { previousState: previousStateRef.current, progress: state.tick === 0 ? 1 : 0, snapCamera: state.tick === 0 });
  }, [state]);

  useEffect(() => {
    const renderOnResize = () => {
      const canvas = canvasRef.current;
      if (canvas) renderGame(canvas, stateRef.current, { previousState: stateRef.current });
    };
    window.addEventListener('resize', renderOnResize);
    return () => window.removeEventListener('resize', renderOnResize);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const direction = directionForKey(event.key);
      if (direction) {
        event.preventDefault();
        directionRef.current = direction;
        queuedDirectionRef.current = direction;
        return;
      }
      if (event.key === 'Escape' && stateRef.current.status !== 'completed') {
        setMode((current) => (current === 'playing' ? 'paused' : 'playing'));
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const direction = directionForKey(event.key);
      if (!direction) return;
      if (directionRef.current === direction) directionRef.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (mode !== 'playing') return;
    let frameId = 0;
    let previous = performance.now();
    let accumulator = 0;

    const frame = (timestamp: number) => {
      accumulator += Math.min(timestamp - previous, GAME_TICK_MS * 3);
      previous = timestamp;

      while (accumulator >= GAME_TICK_MS) {
        const previousState = stateRef.current;
        const direction = directionRef.current ?? queuedDirectionRef.current;
        queuedDirectionRef.current = null;
        const result = stepGame(previousState, direction);
        previousStateRef.current = previousState;
        if (result.objectiveCollected) playSound('objective', soundEnabled);
        if (stateRef.current.status !== 'caught' && result.state.status === 'caught') playSound('caught', soundEnabled);
        replaceState(result.state);
        accumulator -= GAME_TICK_MS;
        if (result.state.status === 'caught' || result.state.status === 'completed') break;
      }

      const canvas = canvasRef.current;
      if (canvas) renderGame(canvas, stateRef.current, { previousState: previousStateRef.current, progress: accumulator / GAME_TICK_MS });
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [mode, replaceState, soundEnabled]);

  useEffect(() => {
    if (state.status !== 'caught') return;
    directionRef.current = null;
    queuedDirectionRef.current = null;
    const timer = window.setTimeout(() => {
      const nextState = resetGame(stateRef.current);
      previousStateRef.current = nextState;
      replaceState(nextState);
    }, CAUGHT_RESET_MS);
    return () => window.clearTimeout(timer);
  }, [replaceState, state.status]);

  useEffect(() => {
    if (state.status !== 'completed' || completionReportedRef.current) return;
    completionReportedRef.current = true;
    directionRef.current = null;
    queuedDirectionRef.current = null;
    playSound('completed', soundEnabled);
    onComplete(elapsedMs(state));
  }, [onComplete, soundEnabled, state]);

  useEffect(() => {
    if (mode !== 'playing' || state.status === 'completed') return;
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [mode, state.status]);

  const start = () => {
    if (state.status === 'completed') return;
    setNow(Date.now());
    setMode('playing');
  };

  const restart = () => {
    directionRef.current = null;
    queuedDirectionRef.current = null;
    completionReportedRef.current = false;
    const nextState = createGameState(floor);
    previousStateRef.current = nextState;
    replaceState(nextState);
    setMode('playing');
  };

  return (
    <section className="game-screen">
      <header className="hud">
        <div>
          <p className="hud-label">FLOOR {String(floorNumber).padStart(2, '0')} / {String(floorCount).padStart(2, '0')}</p>
          <h2>{floor.name}</h2>
        </div>
        <div className="hud-stats">
          <div><span>OBJECTIVE</span><strong className={state.player.hasObjective ? 'status-ready' : ''}>{state.player.hasObjective ? 'SECURED' : 'PENDING'}</strong></div>
          <div><span>ACCESS</span><strong className={state.player.hasKeycard ? 'status-ready' : ''}>{state.player.hasKeycard ? 'GRANTED' : 'NONE'}</strong></div>
          <div className="awareness-stat">
            <span>AWARENESS</span>
            <strong className={state.suspicion >= 70 ? 'awareness-danger' : state.suspicion > 0 ? 'awareness-warning' : ''}>{awarenessLabel(state.suspicion)}</strong>
            <div className="awareness-meter" role="meter" aria-label="Guard awareness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={state.suspicion}>
              <span style={{ width: `${state.suspicion}%` }} />
            </div>
          </div>
          <div><span>TIME</span><strong>{formatTime(elapsedMs(state, now))}</strong></div>
        </div>
        <button className="icon-button" type="button" aria-label="Pause game" onClick={() => setMode('paused')}>II</button>
      </header>

      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          className="game-canvas"
          aria-label={`Ground Zero game board, ${floor.name}`}
          onPointerDown={(event) => {
            gestureStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const startPoint = gestureStartRef.current;
            gestureStartRef.current = null;
            if (!startPoint || mode !== 'playing') return;
            const swipeDirection = directionForDelta(event.clientX - startPoint.x, event.clientY - startPoint.y);
            directionRef.current = swipeDirection ?? (canvasRef.current ? directionForCanvasTap(canvasRef.current, stateRef.current, event.clientX, event.clientY) : null);
            queuedDirectionRef.current = directionRef.current;
            window.setTimeout(() => {
              directionRef.current = null;
            }, GAME_TICK_MS);
          }}
        />
        {state.status === 'caught' && <div className="alarm-flash" role="status"><span>DETECTED</span></div>}
        {interactionLabel(state) && <div className={`interaction-toast interaction-${state.interaction?.kind}`} role="status">{interactionLabel(state)}</div>}
        {mode === 'briefing' && (
          <div className="game-overlay">
            <p className="eyebrow">FLOOR BRIEFING</p>
            <h3>{floor.name}</h3>
            <p>Secure the yellow asset, collect access cards for sealed doors, and use vents to bypass guarded corridors.</p>
            <button className="primary-button" type="button" onClick={start}>Begin infiltration</button>
          </div>
        )}
        {mode === 'paused' && (
          <div className="game-overlay">
            <p className="eyebrow">SYSTEM PAUSED</p>
            <h3>Hold position</h3>
            <div className="overlay-actions">
              <button className="primary-button" type="button" onClick={start}>Resume</button>
              <button className="secondary-button" type="button" onClick={restart}>Restart floor</button>
              <button className="text-button" type="button" onClick={onExit}>Floor select</button>
            </div>
          </div>
        )}
        {state.status === 'completed' && (
          <div className="game-overlay">
            <p className="eyebrow success-text">FLOOR CLEARED</p>
            <h3>{formatTime(elapsedMs(state))}</h3>
            <p>The route is secure. Return to floor selection to continue.</p>
            <button className="primary-button" type="button" onClick={onExit}>Continue</button>
          </div>
        )}
      </div>

      <div className="mobile-controls">
        <p>Swipe or tap the board</p>
        <DirectionPad
          onDirectionStart={(direction) => {
            directionRef.current = direction;
            queuedDirectionRef.current = direction;
          }}
          onDirectionEnd={() => {
            directionRef.current = null;
          }}
        />
      </div>
    </section>
  );
}
