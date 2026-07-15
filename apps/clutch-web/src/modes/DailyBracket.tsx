import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FlatSeries, League } from '../types';
import { dailySeason } from '../lib/daily';
import { flattenSeason, roundOrderFor, roundWeightFor, leagueOf } from '../lib/playoffs';
import { leagueConfig } from '../lib/leagues';
import type { LeagueSelection } from '../lib/leagues';
import { scorePicks } from '../lib/scoring';
import { recordDaily, todaysRecord, loadProfile } from '../lib/storage';
import { buildShareText, shareOrCopy } from '../lib/share';
import { ratingOf } from '../lib/facts';
import { haptic } from '../lib/haptics';
import { trackGameStart, trackGameEnd, trackShare } from '../lib/analytics';
import { teamStyle, shortName } from '../lib/teams';
import { useCountUp } from '../lib/useCountUp';
import { TeamCard } from '../components/TeamCard';
import { TeamLogo } from '../components/TeamLogo';
import { TopBar } from '../components/TopBar';
import { StreakBadge } from '../components/StreakBadge';
import { Confetti } from '../components/Confetti';

type Phase = 'intro' | 'play' | 'result';
type Side = 'east' | 'west';
type Item = { series: FlatSeries; index: number };
type TNode = { item: Item; children: TNode[] };
type RoundGroup = { round: string; items: Item[] };
type Flash = { index: number; correct: boolean } | null;

// Map each series to the indices of the series that feed into it (its winners come
// from these). Built from reality (series.winner), so byes/12-team formats resolve
// gracefully — a series simply has fewer feeders.
function buildFeeders(items: Item[], roundOrder: readonly string[]): Record<number, number[]> {
  const map: Record<number, number[]> = {};
  for (const it of items) {
    const s = it.series;
    const ri = roundOrder.indexOf(s.round);
    if (ri <= 0) {
      map[it.index] = [];
      continue;
    }
    const prev = roundOrder[ri - 1];
    const parts = new Set([s.higherSeed.team, s.lowerSeed.team]);
    map[it.index] = items
      .filter((x) => x.series.round === prev && (s.conference === null || x.series.conference === s.conference) && parts.has(x.series.winner))
      .map((x) => x.index);
  }
  return map;
}

function buildTree(root: Item, byIdx: Map<number, Item>, feeders: Record<number, number[]>): TNode {
  return { item: root, children: (feeders[root.index] ?? []).map((i) => buildTree(byIdx.get(i)!, byIdx, feeders)) };
}

export function DailyBracket({ league: selection }: { league: LeagueSelection }) {
  // Resolve today's season from the selection (single league or the All-Sports mix), then
  // render everything with that season's real league so logos/config/scoring stay correct.
  const season = useMemo(() => dailySeason(selection), [selection]);
  const league = leagueOf(season);
  const cfg = leagueConfig(league);
  const roundOrder = useMemo(() => roundOrderFor(league), [league]);
  const sideRootRound = roundOrder[roundOrder.length - 2];
  const year = season.season;
  const flat = useMemo(() => flattenSeason(season), [season]);

  const withIdx = useMemo<Item[]>(() => flat.map((series, index) => ({ series, index })), [flat]);
  const feeders = useMemo(() => buildFeeders(withIdx, roundOrder), [withIdx, roundOrder]);
  const groups = useMemo<RoundGroup[]>(
    () => roundOrder.map((round) => ({ round, items: withIdx.filter((x) => x.series.round === round) })).filter((g) => g.items.length > 0),
    [withIdx, roundOrder],
  );

  const trees = useMemo(() => {
    const byIdx = new Map(withIdx.map((x) => [x.index, x] as const));
    const finals = withIdx.find((x) => x.series.round === cfg.finalRound);
    const sideRoots = finals ? (feeders[finals.index] ?? []).map((i) => byIdx.get(i)!).filter(Boolean) : [];
    return {
      east: sideRoots[0] ? buildTree(sideRoots[0], byIdx, feeders) : null,
      west: sideRoots[1] ? buildTree(sideRoots[1], byIdx, feeders) : null,
      finals: finals ?? null,
    };
  }, [withIdx, feeders, cfg.finalRound]);

  const existing = todaysRecord(loadProfile(), selection);
  const [phase, setPhase] = useState<Phase>(existing ? 'result' : 'intro');
  const [picks, setPicks] = useState<Record<number, string>>({});
  const [flash, setFlash] = useState<Flash>(null);
  const [streak, setStreak] = useState(() => loadProfile().leagues[selection]?.dailyStreak ?? 0);

  const scored = useMemo(() => scorePicks(league, flat, picks), [league, flat, picks]);
  const total = flat.length;
  const pickedCount = Object.keys(picks).length;
  const allPicked = pickedCount === total;

  const feedersReady = (index: number) => (feeders[index] ?? []).every((f) => picks[f] !== undefined);
  const stateOf = (index: number): 'locked' | 'open' | 'answered' => {
    if (picks[index] !== undefined) return 'answered';
    return feedersReady(index) ? 'open' : 'locked';
  };

  function onPick(index: number, team: string, winner: string) {
    if (picks[index] !== undefined) return;
    const correct = team === winner;
    haptic(correct ? 'success' : 'error');
    setPicks((p) => ({ ...p, [index]: team }));
    setFlash({ index, correct });
    window.setTimeout(() => setFlash((f) => (f && f.index === index ? null : f)), 850);
  }

  function submit() {
    const flags = scored.results.map((r) => r.correct);
    const p = recordDaily(selection, { year, score: scored.score, maxScore: scored.maxScore, correctCount: scored.correctCount, total: flat.length, flags });
    setStreak(p.leagues[selection].dailyStreak);
    trackGameEnd('daily', selection, { score: scored.score, maxScore: scored.maxScore, correct: scored.correctCount, total: flat.length, streak: p.leagues[selection].dailyStreak });
    haptic('heavy');
    setPhase('result');
  }

  if (phase === 'intro') {
    return <Intro league={league} year={year} champion={season.champion} format={season.format} onStart={() => { haptic('light'); trackGameStart('daily', selection); setPhase('play'); }} />;
  }
  if (phase === 'result') {
    return <Result league={league} year={year} champion={season.champion} flat={flat} groups={groups} picks={picks} streak={streak} storedFlags={existing?.flags} />;
  }

  const branchProps = { league, picks, stateOf, onPick, flash, sideRootRound, semiLabel: cfg.semiLabel, finalsLabel: cfg.finalLabel };

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={`${year} Bracket`}
        right={
          <span className="flex items-center gap-2 text-xs font-bold">
            <span className="rounded-lg bg-win/15 px-2 py-1 text-win">✓ {scored.correctCount}</span>
            <span className="rounded-lg bg-court-card px-2 py-1 text-ink-secondary">{pickedCount}/{total}</span>
          </span>
        }
      />

      <div className="h-1 w-full bg-court-card">
        <motion.div className="h-full bg-flame" animate={{ width: `${(pickedCount / total) * 100}%` }} transition={{ ease: 'easeOut' }} />
      </div>

      {/* Conference labels */}
      <div className="pointer-events-none flex items-center justify-between px-4 pt-2 text-[11px] font-bold uppercase tracking-widest">
        <span className="text-hoop">◄ {cfg.sideLabels[0]}</span>
        <span className="text-ink-muted">{cfg.finalRound}</span>
        <span className="text-flame">{cfg.sideLabels[1]} ►</span>
      </div>

      <BracketStage east={trees.east} west={trees.west} finals={trees.finals} {...branchProps} />

      <div className="mx-auto w-full max-w-md px-4 pb-6 safe-b">
        {allPicked ? (
          <button type="button" onClick={submit} className="no-select w-full rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
            See Results →
          </button>
        ) : (
          <div className="rounded-2xl bg-court-card py-3 text-center text-sm font-semibold text-ink-muted">
            Tap the winner of each {cfg.tie} — the champ advances. {total - pickedCount} left
          </div>
        )}
      </div>
    </div>
  );
}

type BranchProps = {
  league: League;
  picks: Record<number, string>;
  stateOf: (i: number) => 'locked' | 'open' | 'answered';
  onPick: (i: number, team: string, winner: string) => void;
  flash: Flash;
  sideRootRound: string;
  semiLabel: string;
  finalsLabel: string;
};

function BracketStage({ east, west, finals, ...bp }: { east: TNode | null; west: TNode | null; finals: Item | null } & BranchProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Start focused on the East first round (where play begins).
    scroller.current?.scrollTo({ left: 0 });
  }, []);

  const finalsState = finals ? bp.stateOf(finals.index) : 'locked';

  return (
    <div ref={scroller} className="flex-1 overflow-auto">
      <div className="flex w-max min-w-full items-center px-4 py-6">
        {east && <Branch node={east} side="east" {...bp} />}
        {finals && (
          <div className="flex items-center">
            <Connector side="east" />
            <MatchCard league={bp.league} item={finals} side="east" state={finalsState} picked={bp.picks[finals.index]} flash={bp.flash} onPick={bp.onPick} tier="finals" semiLabel={bp.semiLabel} finalsLabel={bp.finalsLabel} />
            <Connector side="west" />
          </div>
        )}
        {west && <Branch node={west} side="west" {...bp} />}
      </div>
    </div>
  );
}

function Branch({ node, side, ...bp }: { node: TNode; side: Side } & BranchProps) {
  const hasKids = node.children.length > 0;
  const tier = node.item.series.round === bp.sideRootRound ? 'conf' : 'normal';

  const kids = hasKids ? (
    <div className="flex flex-col justify-center gap-4">
      {node.children.map((c) => (
        <Branch key={c.item.index} node={c} side={side} {...bp} />
      ))}
    </div>
  ) : null;

  return (
    <div className={`flex items-center ${side === 'west' ? 'flex-row-reverse' : ''}`}>
      {kids}
      {hasKids && <Connector side={side} />}
      <MatchCard league={bp.league} item={node.item} side={side} state={bp.stateOf(node.item.index)} picked={bp.picks[node.item.index]} flash={bp.flash} onPick={bp.onPick} tier={tier} semiLabel={bp.semiLabel} finalsLabel={bp.finalsLabel} />
    </div>
  );
}

function Connector({ side }: { side: Side }) {
  return (
    <div className="relative h-full w-3 self-stretch">
      <div className="absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 bg-line-strong" />
      <div className={`absolute top-1/2 h-0.5 w-1/2 -translate-y-1/2 bg-line-strong ${side === 'west' ? 'right-0' : 'left-0'}`} />
    </div>
  );
}

type Tier = 'normal' | 'conf' | 'finals';

function MatchCard({
  league,
  item,
  side,
  state,
  picked,
  flash,
  onPick,
  tier,
  semiLabel,
  finalsLabel,
}: {
  league: League;
  item: Item;
  side: Side;
  state: 'locked' | 'open' | 'answered';
  picked?: string;
  flash: Flash;
  onPick: (i: number, team: string, winner: string) => void;
  tier: Tier;
  semiLabel: string;
  finalsLabel: string;
}) {
  const s = item.series;
  const winner = s.winner;
  const locked = state === 'locked';
  const open = state === 'open';
  const answered = state === 'answered';
  const flashing = flash?.index === item.index ? flash.correct : null;

  const width = tier === 'finals' ? 'w-[132px]' : tier === 'conf' ? 'w-[124px]' : 'w-[118px]';
  const ring =
    tier === 'finals'
      ? 'ring-1 ring-hoop/50'
      : open
        ? 'ring-2 ring-flame'
        : answered
          ? 'ring-1 ring-line-subtle'
          : 'ring-1 ring-line-subtle/60';

  function rowKind(team: string): SlotKind {
    if (locked) return 'placeholder';
    if (open) return 'pick';
    if (team === winner) return 'advanced';
    if (team === picked) return 'wrongpick';
    return 'eliminated';
  }

  return (
    <motion.div
      layout
      className={`relative shrink-0 ${width} overflow-hidden rounded-lg bg-court-elevated ${ring} ${locked ? 'opacity-60' : ''}`}
      animate={
        flashing !== null
          ? { scale: [1, 1.06, 1] }
          : open
            ? { boxShadow: ['0 0 0 0 rgba(249,115,22,0)', '0 0 0 5px rgba(249,115,22,0.22)', '0 0 0 0 rgba(249,115,22,0)'] }
            : { scale: 1 }
      }
      transition={flashing !== null ? { duration: 0.35 } : open ? { duration: 1.9, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      {(tier === 'finals' || tier === 'conf') && (
        <div className={`px-2 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider ${tier === 'finals' ? 'bg-hoop/25 text-hoop' : 'bg-court-card text-ink-muted'}`}>
          {tier === 'finals' ? finalsLabel : semiLabel}
        </div>
      )}

      {locked ? (
        <div>
          <SlotRow league={league} kind="placeholder" />
          <div className="mx-2 h-px bg-line-subtle" />
          <SlotRow league={league} kind="placeholder" />
        </div>
      ) : (
        <motion.div key="teams" initial={{ opacity: 0, x: side === 'west' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
          <SlotRow league={league} kind={rowKind(s.higherSeed.team)} team={s.higherSeed.team} seed={s.higherSeed.seed} onClick={() => onPick(item.index, s.higherSeed.team, winner)} />
          <div className="mx-2 h-px bg-line-subtle" />
          <SlotRow league={league} kind={rowKind(s.lowerSeed.team)} team={s.lowerSeed.team} seed={s.lowerSeed.seed} onClick={() => onPick(item.index, s.lowerSeed.team, winner)} />
        </motion.div>
      )}

      {open && <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-flame" />}


      <AnimatePresence>
        {flashing !== null && (
          <motion.div
            key="flash"
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: -18, scale: 1 }}
            exit={{ opacity: 0, y: -28 }}
            transition={{ duration: 0.4 }}
            className={`pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-lg ${flashing ? 'bg-win text-white' : 'bg-miss text-white'}`}
          >
            {flashing ? '✓ Nailed it' : '✗ Wrong'}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

type SlotKind = 'placeholder' | 'pick' | 'advanced' | 'wrongpick' | 'eliminated';

function SlotRow({ league, kind, team, seed, onClick }: { league: League; kind: SlotKind; team?: string; seed?: string; onClick?: () => void }) {
  if (kind === 'placeholder' || !team) {
    return (
      <div className="flex h-8 items-center gap-1.5 px-2">
        <span className="h-[18px] w-[18px] shrink-0 rounded bg-line-subtle" />
        <span className="text-[11px] font-semibold text-ink-muted">—</span>
      </div>
    );
  }

  const clickable = kind === 'pick';
  const tint = kind === 'advanced' ? 'bg-win/15' : kind === 'wrongpick' ? 'bg-miss/15' : '';
  const dim = kind === 'eliminated' ? 'opacity-40' : '';
  const nameColor = kind === 'wrongpick' ? 'text-miss line-through' : kind === 'advanced' ? 'text-win' : 'text-ink-primary';

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      className={`flex h-8 w-full items-center gap-1.5 px-2 text-left transition ${tint} ${dim} ${clickable ? 'active:scale-[0.97] hover:bg-court-card' : ''}`}
    >
      <TeamLogo league={league} team={team} size={18} />
      <span className={`flex-1 truncate text-[11px] font-semibold leading-none ${nameColor}`}>{shortName(league, team)}</span>
      {kind === 'advanced' && <span className="text-[11px] text-win">✓</span>}
      {kind === 'wrongpick' && <span className="text-[11px] text-miss">✗</span>}
      {(kind === 'pick' || kind === 'eliminated') && <span className="text-[9px] font-bold text-ink-muted">{seed}</span>}
    </button>
  );
}

function Intro({ league, year, champion, format, onStart }: { league: League; year: number; champion: string; format: string; onStart: () => void }) {
  const cfg = leagueConfig(league);
  const cs = teamStyle(league, champion);
  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Daily Challenge" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 text-center safe-b">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div className="rounded-full bg-hoop/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-hoop">{cfg.emoji} Today’s Bracket</div>
          <div className="mt-4 font-display text-8xl leading-none tracking-wide" style={{ color: cs.primary === '#000000' ? '#FFFFFF' : cs.secondary }}>
            {year}
          </div>
          <div className="mt-2 font-display text-3xl tracking-wide">{cfg.playName}</div>
        </motion.div>
        <p className="mt-4 max-w-xs text-ink-secondary">
          Fill the real bracket. Tap who won each {cfg.tie} — get it right and your pick advances; miss it and the real winner marches on. Scroll {cfg.sideLabels[0]} ↔ {cfg.sideLabels[1]} and crown the champ.
        </p>
        <p className="mt-2 text-xs text-ink-muted">{format} format · can you remember the champion?</p>
        <button type="button" onClick={onStart} className="no-select mt-8 w-full max-w-xs rounded-2xl bg-flame py-4 font-display text-2xl tracking-wide text-court-base active:scale-[0.98]">
          Start →
        </button>
      </div>
    </div>
  );
}

function Result({
  league,
  year,
  champion,
  flat,
  groups,
  picks,
  streak,
  storedFlags,
}: {
  league: League;
  year: number;
  champion: string;
  flat: FlatSeries[];
  groups: RoundGroup[];
  picks: Record<number, string>;
  streak: number;
  storedFlags?: readonly boolean[];
}) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const scored = useMemo(() => scorePicks(league, flat, picks), [league, flat, picks]);

  const hasPicks = Object.keys(picks).length > 0;
  const flagFor = (index: number): boolean => (hasPicks ? scored.results[index].correct : Boolean(storedFlags?.[index]));

  const score = hasPicks ? scored.score : flat.reduce((n, s, i) => n + (storedFlags?.[i] ? roundWeightFor(league, s.round) : 0), 0);
  const maxScore = scored.maxScore;
  const correctCount = flat.reduce((n, _s, i) => n + (flagFor(i) ? 1 : 0), 0);

  const tier = ratingOf(score, maxScore);
  const animatedScore = useCountUp(score);
  const cs = teamStyle(league, champion);
  const celebrate = score / maxScore >= 0.65;

  async function onShare() {
    haptic('light');
    trackShare('daily');
    const results = flat.map((s, i) => ({ series: s, pickedTeam: picks[i] ?? '', correct: flagFor(i), points: 0 }));
    const text = buildShareText(league, year, results, score, maxScore, streak);
    const res = await shareOrCopy(text);
    setShareMsg(res === 'copied' ? 'Copied to clipboard!' : res === 'shared' ? 'Shared!' : 'Could not share');
    setTimeout(() => setShareMsg(null), 2000);
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <Confetti fire={celebrate} />
      <TopBar title={`${year} Result`} right={<StreakBadge count={streak} size="sm" />} />
      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-6 safe-b">
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-hoop/25 to-court-card p-6 text-center ring-1 ring-line-strong"
        >
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: `${tier.color}22`, color: tier.color }}>
            <span>{tier.emoji}</span>
            <span>{tier.label}</span>
          </div>
          <div className="mt-3 font-display text-7xl leading-none tracking-wide text-flame">
            {animatedScore}
            <span className="text-2xl text-ink-secondary">/{maxScore}</span>
          </div>
          <p className="mt-1 text-ink-secondary">
            {correctCount}/{flat.length} series correct
          </p>
          <button type="button" onClick={onShare} className="no-select mt-4 w-full rounded-2xl bg-flame py-3 font-display text-xl tracking-wide text-court-base active:scale-[0.98]">
            Share result
          </button>
          <AnimatePresence>
            {shareMsg && (
              <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 text-sm text-win">
                {shareMsg}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-4 flex items-center gap-3 rounded-2xl p-4"
          style={{ background: `linear-gradient(135deg, ${cs.primary}, ${cs.primary}cc)` }}
        >
          <TeamLogo league={league} team={champion} size={44} />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: cs.secondary }}>
              {year} Champion
            </div>
            <div className="font-display text-2xl tracking-wide text-white">{champion}</div>
          </div>
          <span className="ml-auto text-3xl">🏆</span>
        </motion.div>

        <div className="mt-6 space-y-5">
          {groups.map((g) => (
            <div key={g.round}>
              <div className="mb-2 font-display text-xl tracking-wide text-ink-secondary">{g.round}</div>
              <div className="space-y-2">
                {g.items.map(({ series, index }, i) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.03 }}>
                    <RevealRow league={league} series={series} correct={flagFor(index)} picked={picks[index]} />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RevealRow({ league, series, correct, picked }: { league: League; series: FlatSeries; correct: boolean; picked?: string }) {
  const winner = series.winner === series.higherSeed.team ? series.higherSeed : series.lowerSeed;
  const loser = series.winner === series.higherSeed.team ? series.lowerSeed : series.higherSeed;
  return (
    <div className={`rounded-2xl bg-court-card p-2 ring-1 ${correct ? 'ring-win/40' : 'ring-miss/40'}`}>
      <TeamCard league={league} team={winner.team} seed={winner.seed} state="correct" />
      <div className="py-0.5 text-center text-[10px] font-bold uppercase tracking-widest text-ink-muted">
        {series.result} {picked && !correct ? `· you picked ${shortName(league, picked)}` : ''}
      </div>
      <TeamCard league={league} team={loser.team} seed={loser.seed} state={picked === loser.team ? 'wrong' : 'dim'} />
    </div>
  );
}
