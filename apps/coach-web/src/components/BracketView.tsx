import { messages } from '../lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { formatKickoff, formatShortDate, shortCode } from '../lib/format';
import { navigate } from '../lib/router';
import type { KnockoutLeg, KnockoutMatchup, KnockoutStage } from '../types';
import { LiveDot } from './LiveDot';
import { TeamLogo } from './TeamLogo';
import { Icon } from './Icon';
import { ScoreLine } from './ui';

type MatchupTeam = KnockoutMatchup['teams'][number];

// Single-leg ties have no aggregate, so fall back to the one leg's score, oriented to the matchup's team order.
function matchupScore(matchup: KnockoutMatchup): readonly [number, number] | undefined {
  if (matchup.aggregate) return matchup.aggregate;
  const leg = matchup.legs.length === 1 ? matchup.legs[0] : undefined;
  if (!leg || leg.homeScore == null || leg.awayScore == null) return undefined;
  const firstIsHome = !leg.homeId || leg.homeId === matchup.teams[0]?.id;
  return firstIsHome ? [leg.homeScore, leg.awayScore] : [leg.awayScore, leg.homeScore];
}

function TeamLine({ team, score, decided }: { readonly team?: MatchupTeam; readonly score?: number; readonly decided: boolean }) {
  const dim = decided && !team?.isQualified;
  return (
    <div className="flex items-center gap-2">
      {team ? <TeamLogo teamId={team.id} name={team.name} size={18} /> : <span className="size-[18px] shrink-0 rounded-full bg-bg-elevated" />}
      <span className={`min-w-0 flex-1 truncate text-label ${dim ? 'text-text-muted' : team?.isQualified ? 'font-bold' : ''}`} title={team?.name}>
        {team?.name ?? messages().common.tbd}
      </span>
      {score != null && <span className={`score-font text-sm ${dim ? 'text-text-muted' : ''}`}>{score}</span>}
    </div>
  );
}

function MatchupCard({ matchup, onOpen, isFinal }: { readonly matchup: KnockoutMatchup; readonly onOpen: () => void; readonly isFinal: boolean }) {
  const score = matchupScore(matchup);
  const decided = matchup.teams.some((t) => t.isQualified);
  const live = matchup.legs.some((l) => l.status === 'live');
  const nextLeg = matchup.legs.find((l) => l.status === 'scheduled' && l.startTime);
  return (
    <button
      onClick={onOpen}
      className={`flex w-full flex-col gap-1.5 rounded-xl border bg-bg-card px-3 py-2.5 text-start transition hover:bg-bg-elevated/60 ${isFinal ? 'border-accent-fav/50' : 'border-border-subtle'}`}
    >
      <TeamLine team={matchup.teams[0]} score={score?.[0]} decided={decided} />
      <TeamLine team={matchup.teams[1]} score={score?.[1]} decided={decided} />
      {(live || (!score && nextLeg?.startTime)) && (
        <span className="flex items-center gap-1.5 text-caption text-text-muted">
          {live ? (
            <>
              <LiveDot />
              <span className="font-semibold text-accent-live">{messages().common.live}</span>
            </>
          ) : (
            nextLeg?.startTime && `${formatShortDate(nextLeg.startTime)} · ${formatKickoff(nextLeg.startTime)}`
          )}
        </span>
      )}
    </button>
  );
}

function LegRow({ leg, matchup, index, total }: { readonly leg: KnockoutLeg; readonly matchup: KnockoutMatchup; readonly index: number; readonly total: number }) {
  const home = matchup.teams.find((t) => t.id === leg.homeId) ?? matchup.teams[0];
  const away = matchup.teams.find((t) => t !== home) ?? matchup.teams[1];
  const hasScore = leg.homeScore != null && leg.awayScore != null;
  return (
    <button onClick={() => navigate({ name: 'game', id: leg.gameId })} className="flex w-full flex-col gap-1.5 px-4 py-3 text-start transition hover:bg-bg-elevated/60">
      <span className="flex justify-between text-caption text-text-muted">
        <span>{total > 1 ? messages().bracket.leg(index + 1) : messages().bracket.match}</span>
        <span className="flex items-center gap-1.5">
          {leg.status === 'live' && <LiveDot />}
          {leg.startTime ? `${formatShortDate(leg.startTime)} · ${formatKickoff(leg.startTime)}` : ''}
        </span>
      </span>
      <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="flex min-w-0 items-center gap-2">
          {home && <TeamLogo teamId={home.id} name={home.name} size={24} />}
          <span className="truncate text-sm">{home?.name ?? messages().common.tbd}</span>
        </span>
        <span className={`score-font text-base ${leg.status === 'live' ? 'text-accent-live' : ''}`}>{hasScore ? <ScoreLine home={leg.homeScore} away={leg.awayScore} /> : messages().common.vs}</span>
        <span className="flex min-w-0 items-center justify-end gap-2">
          <span className="truncate text-sm">{away?.name ?? messages().common.tbd}</span>
          {away && <TeamLogo teamId={away.id} name={away.name} size={24} />}
        </span>
      </span>
    </button>
  );
}

function MatchupSheet({ matchup, stageName, nextStageName, onClose }: { readonly matchup: KnockoutMatchup; readonly stageName: string; readonly nextStageName?: string; readonly onClose: () => void }) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Modal behaviour: focus moves in, Tab stays inside, Escape closes, focus returns to the matchup that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onCloseRef.current();
      if (e.key !== 'Tab' || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, []);

  const qualified = matchup.teams.find((t) => t.isQualified);
  const [a, b] = matchup.teams;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-border-subtle bg-bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <h2 id={titleId} className="truncate text-sm font-semibold">
            {stageName}
            {a && b && <span className="font-normal text-text-muted"> · {shortCode(a.name)} v {shortCode(b.name)}</span>}
          </h2>
          <button onClick={onClose} aria-label={messages().common.close} className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-bg-elevated">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="divide-y divide-border-subtle">
          {matchup.legs.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">{messages().bracket.noGames}</p>
          ) : (
            matchup.legs.map((leg, i) => <LegRow key={leg.gameId} leg={leg} matchup={matchup} index={i} total={matchup.legs.length} />)
          )}
        </div>
        {matchup.aggregate && matchup.legs.length > 1 && a && b && (
          <p className="score-font border-t border-border-subtle px-4 py-2 text-center text-xs font-normal text-text-secondary">
            {messages().bracket.aggregate} {shortCode(a.name)} {matchup.aggregate[0]} - {matchup.aggregate[1]} {shortCode(b.name)}
          </p>
        )}
        {qualified && (
          <p className="border-t border-border-subtle bg-bg-elevated/40 px-4 py-3 text-center text-sm font-medium text-accent-live">
            {nextStageName ? (
              messages().bracket.advance(qualified.name, nextStageName)
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="trophy" size={15} />
                {qualified.name}
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

type Selected = { readonly matchup: KnockoutMatchup; readonly stageName: string; readonly nextStageName?: string };

export function BracketView({ stages }: { readonly stages: readonly KnockoutStage[] }) {
  const [selected, setSelected] = useState<Selected | null>(null);
  if (!stages.length) return <p className="py-10 text-center text-sm text-text-muted">{messages().bracket.empty}</p>;
  const lastIndex = stages.length - 1;

  return (
    <>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {stages.map((stage, stageIndex) => (
            <div key={`${stage.name}-${stageIndex}`} className="flex w-[200px] shrink-0 flex-col">
              <h3 className={`mb-2 flex items-center justify-center gap-1 text-xs font-semibold ${stageIndex === lastIndex ? 'text-accent-fav' : 'text-text-secondary'}`}>
                {stageIndex === lastIndex && <Icon name="trophy" size={13} />}
                {stage.name}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {stage.matchups.map((matchup, i) => (
                  <MatchupCard
                    key={i}
                    matchup={matchup}
                    isFinal={stageIndex === lastIndex && i === 0}
                    onOpen={() => setSelected({ matchup, stageName: stage.name, nextStageName: stages[stageIndex + 1]?.name })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {selected && <MatchupSheet {...selected} onClose={() => setSelected(null)} />}
    </>
  );
}
