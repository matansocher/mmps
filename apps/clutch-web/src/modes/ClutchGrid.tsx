import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { League } from '../types';
import { dayNumber, msUntilNextDay } from '../lib/daily';
import { dailyGrid, cellAt, matchCell, allTeams, leagueForTeam, type Grid, type Axis } from '../lib/grid';
import { loadProfile, gridToday, liveGridStreak, recordGrid, type GridResult } from '../lib/storage';
import { buildGridShareText, shareOrCopy } from '../lib/share';
import { trackGameStart, track, trackShare } from '../lib/analytics';
import { haptic } from '../lib/haptics';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { Confetti } from '../components/Confetti';
import { StreakBadge } from '../components/StreakBadge';

type CellState = { status: 'empty' | 'correct' | 'missed'; team?: string; league?: League; year?: number };

type Outcome = { result: GridResult; streak: number; isRecord: boolean };

const emptyCells = (): CellState[] => Array.from({ length: 9 }, () => ({ status: 'empty' }));

export function ClutchGrid() {
  const today = useMemo(() => new Date(), []);
  const grid = useMemo(() => dailyGrid(today), [today]);
  const dayNum = dayNumber(today);

  const existing = useMemo(() => gridToday(loadProfile(), today), [today]);
  const [phase, setPhase] = useState<'play' | 'done'>(existing ? 'done' : 'play');
  const [outcome, setOutcome] = useState<Outcome | null>(
    existing ? { result: existing, streak: liveGridStreak(loadProfile(), today), isRecord: false } : null,
  );

  useEffect(() => {
    if (!existing) trackGameStart('clutch-grid');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish(cells: CellState[]) {
    const flags = cells.map((c) => c.status === 'correct');
    const filled = flags.filter(Boolean).length;
    const score = cells.reduce((sum, c, i) => (c.status === 'correct' ? sum + cellAt(grid, Math.floor(i / 3), i % 3).rarity : sum), 0);
    const bestBefore = loadProfile().grid.bestStreak;
    const result: GridResult = { dateKey: keyOf(today), dayNumber: dayNum, filled, score, cells: flags };
    const p = recordGrid(result, today);
    track('grid_completed', { filled, score, streak: p.grid.currentStreak, isRecord: p.grid.currentStreak > bestBefore && p.grid.currentStreak > 0 });
    setOutcome({ result, streak: p.grid.currentStreak, isRecord: p.grid.currentStreak > bestBefore && p.grid.currentStreak > 0 });
    setPhase('done');
  }

  if (phase === 'done' && outcome) return <Result grid={grid} dayNum={dayNum} outcome={outcome} />;
  return <Play grid={grid} dayNum={dayNum} onFinish={finish} />;
}

function keyOf(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function Play({ grid, dayNum, onFinish }: { grid: Grid; dayNum: number; onFinish: (cells: CellState[]) => void }) {
  const [cells, setCells] = useState<CellState[]>(emptyCells);
  const [active, setActive] = useState<number | null>(null);

  const used = cells.filter((c) => c.status !== 'empty').length;
  const left = 9 - used;
  const filled = cells.filter((c) => c.status === 'correct').length;

  function submit(idx: number, team: string) {
    const row = Math.floor(idx / 3);
    const col = idx % 3;
    const hit = matchCell(team, grid.rows[row], grid.cols[col]);
    const next = cells.slice();
    if (hit) {
      next[idx] = { status: 'correct', team, league: hit.league, year: hit.year };
      haptic('success');
    } else {
      next[idx] = { status: 'missed', team };
      haptic('error');
    }
    setCells(next);
    setActive(null);
    if (next.every((c) => c.status !== 'empty')) window.setTimeout(() => onFinish(next), 520);
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Clutch Grid"
        right={<span className="rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">#{dayNum}</span>}
      />

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-3 safe-b">
        <div className="flex items-center justify-between px-1 pt-4">
          <span className="text-sm text-ink-secondary">
            Guesses left: <strong className="text-ink-primary">{left}</strong>
          </span>
          <span className="text-sm font-bold text-win">{filled}/9 filled</span>
        </div>

        {/* 4×4: corner + 3 column headers, then 3 rows of (row header + 3 cells) */}
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <div className="aspect-square rounded-xl bg-court-base" />
          {grid.cols.map((a) => (
            <HeaderChip key={a.id} axis={a} />
          ))}

          {[0, 1, 2].map((r) => (
            <FragmentRow
              key={r}
              rowAxis={grid.rows[r]}
              row={r}
              cells={cells}
              onTap={(idx) => {
                if (cells[idx].status === 'empty') {
                  haptic('light');
                  setActive(idx);
                }
              }}
            />
          ))}
        </div>

        <p className="mt-4 px-1 text-center text-xs text-ink-muted">Tap a square, then name a team that fits both labels.</p>

        <div className="mt-auto pb-6 pt-4">
          <button
            type="button"
            onClick={() => onFinish(cells)}
            className="no-select w-full rounded-2xl bg-court-card py-3 text-sm font-bold text-ink-secondary ring-1 ring-line-strong active:scale-[0.99]"
          >
            {used === 0 ? 'Give up' : 'Finish grid'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {active !== null && (
          <SearchSheet
            row={grid.rows[Math.floor(active / 3)]}
            col={grid.cols[active % 3]}
            onPick={(team) => submit(active, team)}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FragmentRow({ rowAxis, row, cells, onTap }: { rowAxis: Axis; row: number; cells: CellState[]; onTap: (idx: number) => void }) {
  return (
    <>
      <HeaderChip axis={rowAxis} />
      {[0, 1, 2].map((c) => {
        const idx = row * 3 + c;
        return <PlayCell key={idx} state={cells[idx]} onTap={() => onTap(idx)} />;
      })}
    </>
  );
}

function HeaderChip({ axis }: { axis: Axis }) {
  return (
    <div className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl bg-court-card px-1 text-center ring-1 ring-line-subtle">
      <span className="text-lg leading-none">{axis.emoji}</span>
      <span className="text-[10px] font-bold uppercase leading-tight tracking-tight text-ink-secondary">{axis.label}</span>
    </div>
  );
}

function PlayCell({ state, onTap }: { state: CellState; onTap: () => void }) {
  if (state.status === 'correct') {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="flex aspect-square flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl bg-win/15 p-1 ring-2 ring-win"
      >
        <TeamLogo league={state.league!} team={state.team!} size={38} />
        <span className="w-full truncate text-center text-[9px] font-bold text-ink-secondary">{state.year}</span>
      </motion.div>
    );
  }
  if (state.status === 'missed') {
    return (
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        className="flex aspect-square items-center justify-center rounded-xl bg-miss/10 text-2xl text-miss ring-2 ring-miss/50"
      >
        ✗
      </motion.div>
    );
  }
  return (
    <button
      type="button"
      onClick={onTap}
      className="no-select flex aspect-square items-center justify-center rounded-xl bg-court-elevated text-2xl text-ink-muted ring-1 ring-line-strong transition active:scale-95"
    >
      +
    </button>
  );
}

function SearchSheet({ row, col, onPick, onClose }: { row: Axis; col: Axis; onPick: (team: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const teams = useMemo(() => allTeams(), []);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return teams.slice(0, 60);
    return teams.filter((x) => x.team.toLowerCase().includes(t)).slice(0, 60);
  }, [q, teams]);

  return (
    <motion.div className="fixed inset-0 z-30 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="relative flex max-h-[78vh] flex-col rounded-t-3xl bg-court-base pt-3 ring-1 ring-line-strong safe-b"
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line-strong" />
        <div className="px-5">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Tag axis={row} /> <span className="text-ink-muted">×</span> <Tag axis={col} />
          </div>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a team…"
            className="mt-3 w-full rounded-2xl bg-court-card px-4 py-3 text-ink-primary outline-none ring-1 ring-line-strong placeholder:text-ink-muted focus:ring-flame"
          />
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
          {filtered.map((x) => (
            <button
              key={x.team}
              type="button"
              aria-label={x.team}
              onClick={() => onPick(x.team)}
              className="no-select flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left active:bg-court-card"
            >
              <TeamLogo league={leagueForTeam(x.team) ?? x.league} team={x.team} size={34} />
              <span className="truncate text-ink-primary">{x.team}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-sm text-ink-muted">No teams match “{q}”.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Tag({ axis }: { axis: Axis }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-court-card px-2 py-1 text-xs font-bold text-ink-secondary">
      {axis.emoji} {axis.label}
    </span>
  );
}

function Result({ grid, dayNum, outcome }: { grid: Grid; dayNum: number; outcome: Outcome }) {
  const { result, streak, isRecord } = outcome;
  const perfect = result.filled === 9;
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(msUntilNextDay());
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setInterval(() => setRemaining(msUntilNextDay()), 1000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  async function onShare() {
    trackShare('clutch-grid');
    const text = buildGridShareText(dayNum, result.filled, result.score, result.cells, streak);
    const res = await shareOrCopy(text);
    setShareMsg(res === 'copied' ? 'Copied to clipboard!' : res === 'shared' ? 'Shared!' : 'Could not share');
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={perfect || isRecord} />
      <TopBar title={`Grid #${dayNum}`} right={<StreakBadge count={streak} size="sm" />} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 pb-10 text-center safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="mt-4 w-full overflow-hidden rounded-3xl bg-gradient-to-br from-flame/25 to-court-card p-6 ring-1 ring-line-strong"
        >
          {isRecord && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-win/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-win">🔥 Longest streak yet</div>
          )}
          <div className="font-display text-8xl leading-none tracking-wide text-flame">
            {result.filled}
            <span className="text-4xl text-ink-muted">/9</span>
          </div>
          <div className="mt-1 text-ink-secondary">{perfect ? 'Immaculate — a perfect grid! 🏆' : 'today’s Clutch Grid'}</div>

          {/* Spoiler-free grid */}
          <div className="mt-5 flex flex-col items-center gap-1">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex gap-1">
                {[0, 1, 2].map((c) => (
                  <span key={c} className="text-2xl leading-none">
                    {result.cells[r * 3 + c] ? '🟩' : '⬛'}
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-4 text-sm font-bold">
            <span className="text-flame">{result.score} pts</span>
            <span className="text-ink-muted">·</span>
            <span className="text-flame">🔥 {streak} day{streak === 1 ? '' : 's'}</span>
          </div>
        </motion.div>

        <button type="button" onClick={onShare} className="no-select mt-6 w-full rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Share result
        </button>
        <div className="h-5 pt-2 text-sm text-win">{shareMsg}</div>

        <div className="mt-4 rounded-2xl bg-court-card px-5 py-3 text-sm text-ink-secondary">
          Next grid in <span className="font-bold text-ink-primary">{formatCountdown(remaining)}</span>
        </div>

        {/* Answer key */}
        <div className="mt-6 w-full text-left">
          <div className="mb-2 px-1 text-xs uppercase tracking-widest text-ink-muted">A possible answer key</div>
          <div className="grid grid-cols-1 gap-1.5">
            {grid.cells.map((cell, i) => {
              const example = cell.validTeams[0];
              return (
                <div key={i} className="flex items-center justify-between rounded-xl bg-court-card px-3 py-2 text-sm">
                  <span className="text-ink-secondary">
                    {grid.rows[cell.row].emoji} {grid.rows[cell.row].label} × {grid.cols[cell.col].emoji} {grid.cols[cell.col].label}
                  </span>
                  <span className="ml-2 truncate font-bold text-ink-primary">{example}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}
