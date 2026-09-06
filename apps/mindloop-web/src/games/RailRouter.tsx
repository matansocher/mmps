import { useCallback, useEffect, useRef, useState } from 'react';
import { CountdownOverlay } from '../components/CountdownOverlay';
import { playSound } from '../lib/sound';
import type { GameProps } from '../lib/types';
import { advanceRun, createRun, initialSwitches, type Switches, TOTAL_TIME } from './railrouter/engine';
import { LEVELS } from './railrouter/levels';
import { COLORS, type Level } from './railrouter/model';
import './railrouter/rail-router.css';
import { RailBoard, TrainArt } from './railrouter/RailBoard';

type Phase = 'choose' | 'countdown' | 'running' | 'paused';

export default function RailRouter({ onFinish }: GameProps) {
  const [phase, setPhase] = useState<Phase>('choose');
  const [level, setLevel] = useState(LEVELS[0]);
  const [run, setRun] = useState(() => createRun(LEVELS[0]));
  const [switches, setSwitches] = useState<Switches>(() => initialSwitches(LEVELS[0]));
  const runRef = useRef(run);
  const switchesRef = useRef(switches);
  const finished = useRef(false);

  const chooseBoard = (board: Level) => {
    const nextRun = createRun(board);
    const nextSwitches = initialSwitches(board);
    setLevel(board);
    setRun(nextRun);
    setSwitches(nextSwitches);
    runRef.current = nextRun;
    switchesRef.current = nextSwitches;
    finished.current = false;
    setPhase('countdown');
  };

  const start = useCallback(() => setPhase('running'), []);

  useEffect(() => {
    if (phase !== 'running') return;
    let frame = 0;
    let previous: number | undefined;

    const tick = (timestamp: number) => {
      // A hidden tab pauses explicitly, rather than spawning a backlog of trains.
      if (document.hidden) {
        setPhase('paused');
        return;
      }
      const dt = previous === undefined ? 0 : (timestamp - previous) / 1000;
      previous = timestamp;
      const before = runRef.current;
      const next = advanceRun(level, before, switchesRef.current, dt);
      runRef.current = next;
      setRun(next);
      if (next.correct > before.correct) playSound('correct');
      else if (next.wrong > before.wrong) playSound('wrong');

      if (next.finished) {
        if (!finished.current) {
          finished.current = true;
          onFinish({
            score: next.correct,
            stats: [
              { label: 'Correct deliveries', value: String(next.correct) },
              { label: 'Wrong stations', value: String(next.wrong) },
              { label: 'Board', value: level.name },
            ],
          });
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    const pauseWhenHidden = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        setPhase('paused');
      }
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, [phase, level, onFinish]);

  const toggleSwitch = (id: string) => {
    if (phase !== 'running' || finished.current) return;
    const node = level.nodes.find((item) => item.id === id);
    if (!node || node.kind !== 'switch') throw new Error(`Unknown railway switch: ${id}`);
    const next = { ...switchesRef.current, [id]: (switchesRef.current[id] + 1) % node.outputs.length };
    switchesRef.current = next;
    setSwitches(next);
    playSound('click');
  };

  if (phase === 'choose') {
    return (
      <section className="rail-select">
        <div className="rail-select-heading">
          <span className="rail-eyebrow">YOUR SHIFT, YOUR ROUTE</span>
          <h1>Choose a railway</h1>
          <p>One board. 90 seconds. Keep every train on the right track.</p>
        </div>
        <div className="rail-levels">
          {LEVELS.map((board, index) => (
            <button key={board.id} className="rail-level" onClick={() => chooseBoard(board)} aria-label={`Play ${board.name}, ${board.difficulty}, ${board.family}`}>
              <div className="rail-level-preview">
                <RailBoard level={board} switches={initialSwitches(board)} preview />
                <span className="rail-level-number">{index + 1}</span>
              </div>
              <div className="rail-level-caption">
                <strong>{board.name}</strong>
                <span>
                  {board.family} · {board.difficulty}
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="rail-select-note">Tap the light-green junctions to change direction. Match each train to its station's color and number.</p>
      </section>
    );
  }

  const remaining = Math.max(0, Math.ceil(TOTAL_TIME - run.elapsed));
  const timeLabel = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const arrivals = run.correct + run.wrong;
  const latest = run.deliveries[run.deliveries.length - 1];

  return (
    <section className="rail-game" aria-label={`${level.name} railway game`}>
      <div className="rail-toolbar">
        <div>
          <span className="rail-eyebrow">
            {level.family} / {level.difficulty}
          </span>
          <h1>{level.name}</h1>
        </div>
        <button className="rail-pause" disabled={phase === 'countdown'} onClick={() => setPhase(phase === 'paused' ? 'running' : 'paused')}>
          {phase === 'paused' ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="rail-playfield">
        <div className="rail-scoreboard">
          <div>
            <span>TIME</span>
            <strong className={remaining <= 10 ? 'rail-time-low' : ''} data-testid="rail-time">
              {timeLabel}
            </strong>
          </div>
          <div>
            <span>CORRECT</span>
            <strong data-testid="rail-score">
              {run.correct}
              <small> of {arrivals}</small>
            </strong>
          </div>
        </div>
        <div className="rail-time-track">
          <div style={{ transform: `scaleX(${remaining / TOTAL_TIME})` }} />
        </div>
        <RailBoard level={level} switches={switches} trains={run.trains} deliveries={run.deliveries} onSwitch={toggleSwitch} disabled={phase !== 'running'} />
        {phase === 'countdown' && <CountdownOverlay accent="#4ba762" onDone={start} />}
        {phase === 'paused' && (
          <div className="rail-paused">
            <h2>Shift paused</h2>
            <p>Your trains will wait here.</p>
            <button className="rail-resume" onClick={() => setPhase('running')}>
              Resume railway
            </button>
          </div>
        )}
      </div>

      <div className="rail-bottom">
        <div className="rail-next">
          <span>NEXT TRAIN</span>
          <svg viewBox="-30 -18 60 36" width="56" height="34" role="img" aria-label={`Next train: ${COLORS[run.nextColor].id}, ${run.nextColor + 1}`}>
            <TrainArt color={run.nextColor} />
          </svg>
        </div>
        <p className="rail-feedback" role="status">
          {latest ? (latest.correct ? 'Right on track! +1' : 'Wrong station. Keep going!') : 'Tap a green junction to switch its route.'}
        </p>
      </div>
      <div className="rail-station-key" aria-label="Station colors">
        {level.nodes
          .filter((node) => node.kind === 'station')
          .map((station) => {
            const color = station.color!;
            return (
              <span key={station.id}>
                <i style={{ background: COLORS[color].hex, color: COLORS[color].ink }}>{color + 1}</i>
                {COLORS[color].id}
              </span>
            );
          })}
      </div>
    </section>
  );
}
