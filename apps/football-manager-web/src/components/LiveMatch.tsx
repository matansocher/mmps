import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { AdvanceResult, BallFrame, LiveMatchSquads, LiveMatchView, Mentality, PlayerDot, PlayerFrame, TimelineEvent } from '../types';

type Props = {
  readonly initialView: LiveMatchView;
  readonly initialSquads: LiveMatchSquads;
  readonly onFinished: (result: AdvanceResult) => void;
};

const SPEEDS = [1, 2, 4] as const;
const TICK_MS = 700; // real-time per in-game minute at 1x
const PITCH_W = 360;
const PITCH_H = 560;
const EVENT_PAUSE_MS = 2000; // auto-resume delay after a highlighted event

// Interpolate the ball position between the two frames bracketing `minute`.
function ballAt(frames: readonly BallFrame[], minute: number): { x: number; y: number; possession: 'home' | 'away' } {
  if (!frames.length) return { x: 0.5, y: 0.5, possession: 'home' };
  let prev = frames[0];
  let next = frames[0];
  for (const f of frames) {
    if (f.minute <= minute) prev = f;
    if (f.minute >= minute) {
      next = f;
      break;
    }
    next = f;
  }
  if (prev.minute === next.minute) return { x: prev.x, y: prev.y, possession: prev.possession };
  const t = (minute - prev.minute) / (next.minute - prev.minute);
  return { x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t, possession: t < 0.5 ? prev.possession : next.possession };
}

// Interpolate 22 player dots between the two player frames bracketing `minute`.
function dotsAt(frames: readonly PlayerFrame[], minute: number): { home: readonly PlayerDot[]; away: readonly PlayerDot[] } {
  if (!frames.length) return { home: [], away: [] };
  let prev = frames[0];
  let next = frames[0];
  for (const f of frames) {
    if (f.minute <= minute) prev = f;
    if (f.minute >= minute) {
      next = f;
      break;
    }
    next = f;
  }
  if (prev.minute === next.minute) return { home: prev.home, away: prev.away };
  const t = (minute - prev.minute) / (next.minute - prev.minute);
  const lerp = (a: readonly PlayerDot[], b: readonly PlayerDot[]) => a.map((d, i) => ({ x: d.x + ((b[i]?.x ?? d.x) - d.x) * t, y: d.y + ((b[i]?.y ?? d.y) - d.y) * t }));
  return { home: lerp(prev.home, next.home), away: lerp(prev.away, next.away) };
}

function drawPitchLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  const m = 10; // margin
  // Touchlines.
  ctx.strokeRect(m, m, w - 2 * m, h - 2 * m);
  // Halfway line + centre circle + spot.
  ctx.beginPath();
  ctx.moveTo(m, h / 2);
  ctx.lineTo(w - m, h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  const boxW = (w - 2 * m) * 0.62;
  const boxH = (h - 2 * m) * 0.16;
  const sixW = (w - 2 * m) * 0.3;
  const sixH = (h - 2 * m) * 0.06;
  // Bottom (home) penalty area + six-yard + spot + arc.
  ctx.strokeRect((w - boxW) / 2, h - m - boxH, boxW, boxH);
  ctx.strokeRect((w - sixW) / 2, h - m - sixH, sixW, sixH);
  ctx.beginPath();
  ctx.arc(w / 2, h - m - boxH * 0.62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, h - m - boxH, 42, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // Top (away) penalty area + six-yard + spot + arc.
  ctx.strokeRect((w - boxW) / 2, m, boxW, boxH);
  ctx.strokeRect((w - sixW) / 2, m, sixW, sixH);
  ctx.beginPath();
  ctx.arc(w / 2, m + boxH * 0.62, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w / 2, m + boxH, 42, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
}

function Pitch({ view }: { readonly view: LiveMatchView }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // Grass with horizontal mow stripes (vertical pitch).
    ctx.fillStyle = '#12633a';
    ctx.fillRect(0, 0, w, h);
    const stripes = 11;
    for (let i = 0; i < stripes; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#15723f' : '#12633a';
      ctx.fillRect(0, (i * h) / stripes, w, h / stripes);
    }
    // Broadcast vignette.
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, h * 0.65);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    drawPitchLines(ctx, w, h);

    // Vertical mapping: user's goal at the bottom → team attacks upward.
    // Server coords: ball/dot x = 0 (home goal) .. 1 (away goal). Home sits at
    // the bottom, away at the top, so top = (1 - x); left = y.
    const inset = 20;
    const px = (y: number) => inset + y * (w - 2 * inset);
    const py = (x: number) => inset + (1 - x) * (h - 2 * inset);

    const { home, away } = dotsAt(view.playerFrames, view.minute);
    const drawDots = (dots: readonly PlayerDot[], side: 'home' | 'away') => {
      const isUser = side === view.userSide;
      const fill = isUser ? 'rgba(41,224,122,0.95)' : 'rgba(255,84,104,0.95)';
      const ring = isUser ? 'rgba(20,120,60,0.9)' : 'rgba(150,30,45,0.9)';
      dots.forEach((d, i) => {
        const cx = px(d.y);
        const cy = py(d.x);
        // Soft shadow.
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fill();
        // Jersey disc.
        ctx.beginPath();
        ctx.arc(cx, cy, 9, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = ring;
        ctx.stroke();
        // Shirt number (index 0 = GK → 1).
        ctx.fillStyle = isUser ? '#08341c' : '#3a0910';
        ctx.font = '700 10px Barlow, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), cx, cy + 0.5);
      });
    };
    drawDots(home, 'home');
    drawDots(away, 'away');

    // Ball with a fading trail over the previous few minutes.
    const trailMinutes = [3, 2, 1, 0];
    trailMinutes.forEach((back, idx) => {
      const bt = ballAt(view.frames, Math.max(0, view.minute - back));
      const alpha = 0.12 + idx * 0.14;
      ctx.beginPath();
      ctx.arc(px(bt.y), py(bt.x), 4 - (trailMinutes.length - 1 - idx) * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });
    const b = ballAt(view.frames, view.minute);
    const bx = px(b.y);
    const by = py(b.x);
    ctx.beginPath();
    ctx.arc(bx, by, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.stroke();
  }, [view]);

  return <canvas ref={ref} width={PITCH_W} height={PITCH_H} className="fm-pitch fm-pitch-portrait" />;
}

// Possession bar: user share on the left (green), opponent on the right (red).
function PossessionBar({ view }: { readonly view: LiveMatchView }) {
  const homePct = view.stats.home.possessionPct;
  const awayPct = view.stats.away.possessionPct;
  const userPct = view.userSide === 'home' ? homePct : awayPct;
  const oppPct = 100 - userPct;
  return (
    <div className="fm-possession">
      <span className="pc user">{userPct}%</span>
      <div className="bar" role="img" aria-label={`Possession ${userPct}% you, ${oppPct}% opponent`}>
        <span className="fill user" style={{ width: `${userPct}%` }} />
        <span className="fill opp" style={{ width: `${oppPct}%` }} />
      </div>
      <span className="pc opp">{oppPct}%</span>
    </div>
  );
}

// Comparative stats table (user column vs opponent column).
function StatsPanel({ view }: { readonly view: LiveMatchView }) {
  const user = view.userSide === 'home' ? view.stats.home : view.stats.away;
  const opp = view.userSide === 'home' ? view.stats.away : view.stats.home;
  const rows: readonly { readonly label: string; readonly u: number; readonly o: number }[] = [
    { label: 'Shots', u: user.shots, o: opp.shots },
    { label: 'On target', u: user.shotsOnTarget, o: opp.shotsOnTarget },
    { label: 'Passes', u: user.passes, o: opp.passes },
    { label: 'Tackles', u: user.tackles, o: opp.tackles },
    { label: 'Corners', u: user.corners, o: opp.corners },
    { label: 'Fouls', u: user.fouls, o: opp.fouls },
  ];
  return (
    <div className="fm-stats">
      <p className="section-title fm-stats-title">Match stats</p>
      {rows.map((r) => {
        const total = r.u + r.o || 1;
        return (
          <div key={r.label} className="fm-stat">
            <span className={`v ${r.u >= r.o ? 'lead' : ''}`}>{r.u}</span>
            <span className="lbl">{r.label}</span>
            <span className={`v ${r.o >= r.u ? 'lead' : ''}`}>{r.o}</span>
            <span className="track">
              <span className="seg user" style={{ width: `${(r.u / total) * 100}%` }} />
              <span className="seg opp" style={{ width: `${(r.o / total) * 100}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function LiveMatch({ initialView, initialSquads, onFinished }: Props) {
  const [view, setView] = useState<LiveMatchView>(initialView);
  const [squads, setSquads] = useState<LiveMatchSquads>(initialSquads);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [busy, setBusy] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [subOut, setSubOut] = useState<number | null>(null);
  const [flash, setFlash] = useState<TimelineEvent | null>(null);
  const timer = useRef<number | null>(null);
  const flashTimer = useRef<number | null>(null);
  const goalCount = useRef<number>(initialView.events.filter((e) => e.type === 'goal').length);

  const clearFlashTimer = useCallback(() => {
    if (flashTimer.current) {
      window.clearTimeout(flashTimer.current);
      flashTimer.current = null;
    }
  }, []);

  const dismissFlash = useCallback(() => {
    clearFlashTimer();
    setFlash(null);
    setPlaying(true);
  }, [clearFlashTimer]);

  const tick = useCallback(async () => {
    try {
      const { view: v } = await api.matchTick(1);
      setView(v);
      // Detect a newly-revealed goal and pause on it with a flash overlay.
      const goals = v.events.filter((e) => e.type === 'goal');
      if (goals.length > goalCount.current) {
        goalCount.current = goals.length;
        const latest = goals[goals.length - 1];
        setPlaying(false);
        setFlash(latest);
        clearFlashTimer();
        flashTimer.current = window.setTimeout(() => {
          setFlash(null);
          if (!v.finished) setPlaying(true);
        }, EVENT_PAUSE_MS);
      } else {
        goalCount.current = goals.length;
      }
      if (v.finished) setPlaying(false);
    } catch {
      setPlaying(false);
    }
  }, [clearFlashTimer]);

  useEffect(() => {
    if (!playing || view.finished || flash) return;
    timer.current = window.setInterval(() => void tick(), TICK_MS / speed);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [playing, speed, view.finished, flash, tick]);

  useEffect(() => () => clearFlashTimer(), [clearFlashTimer]);

  async function skipToEnd() {
    setPlaying(false);
    clearFlashTimer();
    setFlash(null);
    setBusy(true);
    try {
      const { view: v } = await api.matchTick(0, true);
      goalCount.current = v.events.filter((e) => e.type === 'goal').length;
      setView(v);
    } finally {
      setBusy(false);
    }
  }

  async function changeMentality(m: Mentality) {
    setBusy(true);
    try {
      const { view: v } = await api.matchTactic(m);
      setView(v);
    } finally {
      setBusy(false);
    }
  }

  async function makeSub(inPlayerId: number) {
    if (subOut == null) return;
    setBusy(true);
    try {
      const { view: v, squads: s } = await api.matchSub(subOut, inPlayerId);
      setView(v);
      setSquads(s);
      setSubOut(null);
      setShowSubs(false);
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setPlaying(false);
    setBusy(true);
    try {
      const result = await api.matchFinish();
      onFinished(result);
    } finally {
      setBusy(false);
    }
  }

  const revealed = [...view.events].reverse();

  return (
    <div className="fm-live">
      {flash && (
        <div className="fm-flash" role="alertdialog" aria-label={`${flash.text}`} onClick={dismissFlash}>
          <div className="fm-flash-card">
            <span className="fm-flash-kicker">{flash.type === 'goal' ? 'GOAL!' : 'KEY MOMENT'}</span>
            <span className="fm-flash-score">
              {view.homeGoals} – {view.awayGoals}
            </span>
            <span className="fm-flash-text">{flash.text}</span>
            {flash.playerName && <span className="fm-flash-scorer">{flash.playerName}</span>}
            <button className="fm-flash-continue" onClick={dismissFlash}>
              Continue ▶
            </button>
          </div>
        </div>
      )}

      <div className="fm-live-score">
        <span className="clock">{view.finished ? 'FT' : `${view.minute}'`}</span>
        <span className={`team home${view.userSide === 'home' ? ' you' : ''}`}>{view.homeTeamName}</span>
        <span className="score">
          {view.homeGoals} – {view.awayGoals}
        </span>
        <span className={`team away${view.userSide === 'away' ? ' you' : ''}`}>{view.awayTeamName}</span>
      </div>

      <div className="fm-minutebar" role="img" aria-label={`${view.finished ? 90 : view.minute} of 90 minutes played`}>
        <span className="fm-minutebar-fill" style={{ width: `${Math.min(100, ((view.finished ? 90 : view.minute) / 90) * 100)}%` }} />
        <span className="fm-minutebar-ht" title="Half time" />
      </div>

      <PossessionBar view={view} />

      <div className="fm-legend">
        <span className="fm-legend-item">
          <span className="fm-legend-dot user" /> {view.userSide === 'home' ? view.homeTeamName : view.awayTeamName} (you)
        </span>
        <span className="fm-legend-item">
          <span className="fm-legend-dot opp" /> {view.userSide === 'home' ? view.awayTeamName : view.homeTeamName}
        </span>
      </div>

      <Pitch view={view} />

      <StatsPanel view={view} />

      {!view.finished && (
        <div className="fm-controls">
          <button onClick={() => setPlaying((p) => !p)} disabled={busy}>
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          {SPEEDS.map((s) => (
            <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>
              {s}x
            </button>
          ))}
          <button onClick={skipToEnd} disabled={busy}>
            ⏭ Skip to end
          </button>
        </div>
      )}

      {!view.finished && (
        <div className="fm-tactics">
          <span className="label">Mentality</span>
          {(['defensive', 'balanced', 'attacking'] as const).map((m) => (
            <button key={m} className={`fm-cap ${view.userMentality === m ? 'active' : ''}`} onClick={() => void changeMentality(m)} disabled={busy}>
              {m}
            </button>
          ))}
          <button className="sub-btn" onClick={() => setShowSubs((s) => !s)} disabled={busy || view.subsRemaining <= 0}>
            Subs ({view.subsRemaining} left)
          </button>
        </div>
      )}

      {showSubs && !view.finished && (
        <div className="fm-subs">
          <div>
            <p className="section-title">On pitch — pick who comes off</p>
            {squads.onPitch.map((p) => (
              <button key={p.playerId} className={`sub-row ${subOut === p.playerId ? 'active' : ''}`} onClick={() => setSubOut(p.playerId)}>
                <span>{p.name}</span>
                <span className="ovr">{p.overall}</span>
              </button>
            ))}
          </div>
          <div>
            <p className="section-title">Bench — pick who comes on</p>
            {squads.bench.map((p) => (
              <button key={p.playerId} className="sub-row" onClick={() => void makeSub(p.playerId)} disabled={subOut == null}>
                <span>{p.name}</span>
                <span className="ovr">{p.overall}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fm-ticker">
        {revealed.length === 0 && <p className="muted">Kick off to see events…</p>}
        {revealed.map((e, i) => (
          <div key={i} className={`fm-event ${e.type}`}>
            <span className="min">{e.minute}&apos;</span>
            <span className="txt">
              {e.type === 'goal' ? '⚽ ' : ''}
              {e.text}
              {e.playerName ? ` — ${e.playerName}` : ''}
            </span>
          </div>
        ))}
      </div>

      {view.decisions.length > 0 && (
        <div className="fm-decisions">
          {view.decisions.map((d, i) => (
            <span key={i} className="chip">
              {d.minute}&apos; {d.label}
            </span>
          ))}
        </div>
      )}

      {view.finished && (
        <div className="actions">
          <button onClick={finish} disabled={busy}>
            {busy ? 'Committing…' : 'Confirm result & advance'}
          </button>
        </div>
      )}
    </div>
  );
}
