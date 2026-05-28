import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { teamLogo } from '../lib/logos';
import type { KnockoutLeg, KnockoutMatchup, KnockoutParticipant, KnockoutStage } from '../types';

function WinnerBadge() {
  return (
    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-sky-500 ring-2 ring-bg-card flex items-center justify-center">
      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 6.5 L5 9 L10 3.5" />
      </svg>
    </span>
  );
}

function TeamBadge({ p, size = 36 }: { p?: KnockoutParticipant; size?: number }) {
  if (!p) return <div className="rounded-full bg-bg-elevated/60" style={{ width: size, height: size }} />;
  return (
    <div className="relative shrink-0">
      <img src={teamLogo(p.id, size * 2)} alt="" className="object-contain" style={{ width: size, height: size }} loading="lazy" />
      {p.isQualified && <WinnerBadge />}
    </div>
  );
}

function ScoreLine({ score, className = '' }: { score?: number[]; className?: string }) {
  if (!score || score.length < 2) return null;
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return <div className={`score-font text-text-primary ${className}`}>{`${fmt(score[0])} - ${fmt(score[1])}`}</div>;
}

function MatchupChip({ matchup, onOpen }: { matchup: KnockoutMatchup; onOpen: () => void }) {
  const [a, b] = matchup.participants;
  return (
    <button
      onClick={onOpen}
      className="w-[78px] shrink-0 bg-bg-card border border-border-subtle rounded-xl px-1.5 py-2 flex flex-col items-center gap-1.5 hover:bg-bg-elevated/40 transition-colors"
    >
      <div className="flex items-center gap-1.5">
        <TeamBadge p={a} size={24} />
        <TeamBadge p={b} size={24} />
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-medium tracking-wide">
        <span className="w-6 text-center truncate">{a?.symbolicName ?? '—'}</span>
        <span className="w-6 text-center truncate">{b?.symbolicName ?? '—'}</span>
      </div>
      <ScoreLine score={matchup.score} className="text-xs" />
    </button>
  );
}

function FinalCard({ matchup, onOpen }: { matchup: KnockoutMatchup; onOpen: () => void }) {
  const [a, b] = matchup.participants;
  const hasScore = matchup.score && matchup.score.length >= 2;
  return (
    <button onClick={onOpen} className="w-full bg-bg-card border border-border-subtle rounded-2xl p-4 my-3 hover:bg-bg-elevated/40 transition-colors">
      <div className="grid grid-cols-3 items-center">
        <div className="flex flex-col items-center gap-1.5">
          <TeamBadge p={a} size={52} />
          <span className="text-sm text-text-primary text-center truncate w-full px-1">{a?.name ?? '—'}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl leading-none">🏆</span>
          {hasScore ? <ScoreLine score={matchup.score} className="text-base mt-1" /> : <span className="text-xs text-text-secondary mt-1">גמר</span>}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <TeamBadge p={b} size={52} />
          <span className="text-sm text-text-primary text-center truncate w-full px-1">{b?.name ?? '—'}</span>
        </div>
      </div>
    </button>
  );
}

function LegRow({ leg, matchup, totalLegs, idx }: { leg: KnockoutLeg; matchup: KnockoutMatchup; totalLegs: number; idx: number }) {
  const [, navigate] = useLocation();
  const homeParticipant = matchup.participants.find((p) => p.id === leg.homeCompetitorId);
  const awayParticipant = matchup.participants.find((p) => p.id === leg.awayCompetitorId);
  const rightTeam = homeParticipant ?? matchup.participants[0];
  const leftTeam = awayParticipant ?? matchup.participants[1];
  const rightScore = leg.homeScore;
  const leftScore = leg.awayScore;
  const hasScore = typeof rightScore === 'number' && typeof leftScore === 'number';

  const onTap = () => leg.gameId && navigate(`/match/${leg.gameId}`);
  const isLast = idx === totalLegs - 1;
  const hasAggregate = isLast && totalLegs > 1 && matchup.score && matchup.score.length >= 2;

  return (
    <div className="px-4 py-3 border-b border-border-subtle last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-text-muted">{leg.statusText ?? ''}</span>
      </div>
      <button onClick={onTap} className="w-full flex items-center justify-between gap-3 text-right hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-2 min-w-0 justify-start flex-1">
          <TeamBadge p={leftTeam} size={28} />
          <span className="text-sm text-text-primary truncate">{leftTeam?.name ?? '—'}</span>
        </div>
        <div className="score-font text-text-primary text-base whitespace-nowrap">
          {hasScore ? `${leftScore} - ${rightScore}` : 'vs'}
        </div>
        <div className="flex items-center gap-2 min-w-0 justify-end flex-1">
          <span className="text-sm text-text-primary truncate">{rightTeam?.name ?? '—'}</span>
          <TeamBadge p={rightTeam} size={28} />
        </div>
      </button>
      <div className="mt-1.5 text-[11px] text-text-secondary text-center">
        {hasAggregate
          ? `סה״כ ${matchup.score![1]} - ${matchup.score![0]}`
          : totalLegs > 1
            ? `משחק ${leg.num}`
            : ''}
      </div>
    </div>
  );
}

function MatchupModal({ matchup, competitionName, stageName, nextStageName, onClose }: { matchup: KnockoutMatchup; competitionName: string; stageName: string; nextStageName?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const qualified = matchup.participants.find((p) => p.isQualified);
  const legs = matchup.legs.length > 0
    ? matchup.legs
    : matchup.gameId
      ? [{ gameId: matchup.gameId, num: 1 } as KnockoutLeg]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md bg-bg-card border border-border-subtle rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-bg-elevated/60 flex items-center justify-center text-text-secondary" aria-label="סגור">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
          <h2 className="text-sm font-semibold text-text-primary">{`${competitionName} - ${stageName}`}</h2>
        </div>
        <div>
          {legs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-secondary">אין נתונים</div>
          ) : (
            legs.map((leg, idx) => <LegRow key={leg.gameId ?? idx} leg={leg} matchup={matchup} totalLegs={legs.length} idx={idx} />)
          )}
        </div>
        {qualified && nextStageName && (
          <div className="px-4 py-3 border-t border-border-subtle bg-bg-elevated/40 text-center text-sm text-sky-400 font-medium">
            {`${qualified.name} העפילה ל${nextStageName}`}
          </div>
        )}
      </div>
    </div>
  );
}

function StageLabel({ name, accent = false }: { name: string; accent?: boolean }) {
  return <h3 className={`text-xs text-center my-2 ${accent ? 'text-sky-400 font-semibold' : 'text-text-secondary'}`}>{name}</h3>;
}

function ChipsRow({ matchups, stageNum, onOpen }: { matchups: KnockoutMatchup[]; stageNum: number; onOpen: (m: KnockoutMatchup) => void }) {
  if (matchups.length === 0) return null;
  return (
    <div className="w-full flex justify-center gap-2 flex-wrap">
      {matchups.map((m, idx) => (
        <MatchupChip key={`${stageNum}-${idx}`} matchup={m} onOpen={() => onOpen(m)} />
      ))}
    </div>
  );
}

function Connector() {
  return <div className="w-px h-4 bg-border-subtle mx-auto" />;
}

function splitHalves<T>(arr: T[]): [T[], T[]] {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}

type SelectedMatchup = { matchup: KnockoutMatchup; stageName: string; nextStageName?: string };

export function BracketView({ stages, competitionName }: { stages: KnockoutStage[]; competitionName: string }) {
  const [selected, setSelected] = useState<SelectedMatchup | null>(null);

  if (stages.length === 0) return null;

  const lastStage = stages[stages.length - 1];
  const isFinalShape = lastStage.matchups.length === 1;
  const finalMatchup = isFinalShape ? lastStage.matchups[0] : null;
  const nonFinalStages = isFinalShape ? stages.slice(0, -1) : stages;
  const nextStageNameByIndex = (i: number) => stages[i + 1]?.name;

  const openStage = (m: KnockoutMatchup, stageIdx: number) => {
    setSelected({ matchup: m, stageName: stages[stageIdx].name, nextStageName: nextStageNameByIndex(stageIdx) });
  };

  if (!finalMatchup) {
    return (
      <>
        <div className="flex flex-col">
          {nonFinalStages.map((stage, idx) => (
            <div key={stage.num}>
              {idx > 0 && <Connector />}
              <StageLabel name={stage.name} />
              <ChipsRow matchups={stage.matchups} stageNum={stage.num} onOpen={(m) => openStage(m, idx)} />
            </div>
          ))}
        </div>
        {selected && <MatchupModal {...selected} competitionName={competitionName} onClose={() => setSelected(null)} />}
      </>
    );
  }

  const halves = nonFinalStages.map((stage, originalIdx) => {
    const [top, bottom] = splitHalves(stage.matchups);
    return { stage, originalIdx, top, bottom };
  });

  const finalIdx = stages.length - 1;

  return (
    <>
      <div className="flex flex-col">
        {halves.map(({ stage, top, originalIdx }, idx) => (
          <div key={`top-${stage.num}`}>
            <StageLabel name={stage.name} />
            <ChipsRow matchups={top} stageNum={stage.num} onOpen={(m) => openStage(m, originalIdx)} />
            {idx < halves.length - 1 && <Connector />}
          </div>
        ))}

        <StageLabel name={lastStage.name} accent />
        <FinalCard matchup={finalMatchup} onOpen={() => openStage(finalMatchup, finalIdx)} />

        {[...halves].reverse().map(({ stage, bottom, originalIdx }, revIdx) => (
          <div key={`bot-${stage.num}`}>
            {revIdx > 0 && <Connector />}
            <StageLabel name={stage.name} />
            <ChipsRow matchups={bottom} stageNum={stage.num} onOpen={(m) => openStage(m, originalIdx)} />
          </div>
        ))}
      </div>
      {selected && <MatchupModal {...selected} competitionName={competitionName} onClose={() => setSelected(null)} />}
    </>
  );
}
