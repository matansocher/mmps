import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useResource } from '../hooks/useResource';
import { api } from '../lib/api';
import { formatKickoff, formatLongDate, formatShortDate } from '../lib/format';
import { useT } from '../lib/i18n';
import type { FormResult, Game, GameDetail, GameSummary, LineupPlayer, Team } from '../types';
import { ChannelBadge } from './ChannelBadge';
import { openGame, StandingsSnippet } from './GameCard';
import { Icon } from './Icon';
import { TeamLogo } from './TeamLogo';
import { FormBadge, ForwardArrow } from './ui';

type Props = {
  readonly game: Game;
  readonly trigger: HTMLElement | null;
  readonly onClose: () => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function teamLabel(team: Team): string {
  return team.shortName || team.name;
}

function formResults(detail: GameDetail | null, game: Game, side: 'home' | 'away'): readonly FormResult[] {
  const form = detail?.game.form ?? game.form;
  if (form?.[side].length) return form[side].map((f) => f.result);
  const recent = side === 'home' ? detail?.headToHead?.homeRecent : detail?.headToHead?.awayRecent;
  return (recent ?? [])
    .map((g) => g.result)
    .filter((r): r is FormResult => !!r)
    .reverse();
}

function scoreLine(meeting: GameSummary): string {
  return `${teamLabel(meeting.home)} ${meeting.home.score ?? ''}-${meeting.away.score ?? ''} ${teamLabel(meeting.away)}`;
}

function Block({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">{title}</h3>
      {children}
    </section>
  );
}

function TeamLine({ team, children }: { readonly team: Team; readonly children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamLogo teamId={team.id} name={team.name} size={20} />
      <span className="min-w-0 flex-1 truncate text-sm">{teamLabel(team)}</span>
      {children}
    </div>
  );
}

function Absentees({ players }: { readonly players: readonly LineupPlayer[] }) {
  const t = useT().dashboard.preMatch;
  if (!players.length) return <span className="text-xs text-text-secondary">{t.noAbsentees}</span>;
  return <span className="min-w-0 text-end text-xs text-text-secondary">{players.slice(0, 5).map((p) => p.shortName || p.name).join(', ')}</span>;
}

function Skeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <span className="h-3 w-24 rounded bg-white/[0.06]" />
          <span className="h-5 w-full rounded bg-white/[0.04]" />
          <span className="h-5 w-4/5 rounded bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}

function Content({ game, detail }: { readonly game: Game; readonly detail: GameDetail }) {
  const t = useT();
  const p = t.dashboard.preMatch;
  const standings = detail.game.standings ?? game.standings;
  const h2h = detail.headToHead;
  const total = h2h ? h2h.record.homeWins + h2h.record.draws + h2h.record.awayWins : 0;
  const lastMeeting = h2h?.meetings[0];
  const lineups = detail.lineups;
  const sides = [
    { side: 'home' as const, team: game.home },
    { side: 'away' as const, team: game.away },
  ];
  const hasForm = sides.some(({ side }) => formResults(detail, game, side).length > 0);

  return (
    <div className="flex flex-col gap-5">
      {hasForm && (
        <Block title={p.form}>
          {sides.map(({ side, team }) => (
            <TeamLine key={side} team={team}>
              <span className="flex gap-0.5" dir="ltr">
                {formResults(detail, game, side).map((r, i) => (
                  <FormBadge key={i} result={r} />
                ))}
              </span>
            </TeamLine>
          ))}
        </Block>
      )}
      {standings && <StandingsSnippet game={{ ...game, standings }} />}
      <Block title={p.h2h}>
        {total > 0 && h2h ? (
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-3 rounded-xl bg-white/[0.03] py-2 text-center">
              {[
                { label: t.h2h.wins(teamLabel(game.home)), value: h2h.record.homeWins },
                { label: t.h2h.draws, value: h2h.record.draws },
                { label: t.h2h.wins(teamLabel(game.away)), value: h2h.record.awayWins },
              ].map((c) => (
                <div key={c.label} className="flex min-w-0 flex-col px-1">
                  <span className="score-font text-lg">{c.value}</span>
                  <span className="truncate text-[11px] text-text-secondary">{c.label}</span>
                </div>
              ))}
            </div>
            {lastMeeting && <p className="text-xs text-text-secondary">{p.lastMeeting(scoreLine(lastMeeting), formatShortDate(lastMeeting.startTime))}</p>}
          </div>
        ) : (
          <span className="text-xs text-text-secondary">{p.noMeetings}</span>
        )}
      </Block>
      {lineups && (
        <Block title={p.absentees}>
          {sides.map(({ side, team }) => (
            <TeamLine key={side} team={team}>
              <Absentees players={lineups[side].missing} />
            </TeamLine>
          ))}
        </Block>
      )}
    </div>
  );
}

export function PreMatchModal({ game, trigger, onClose }: Props) {
  const t = useT();
  const p = t.dashboard.preMatch;
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(true);
  const { data, errorStatus, reload } = useResource(() => api.game(game.id), `prematch-${game.id}`);

  useEffect(() => {
    const root = document.getElementById('root');
    const overflow = document.body.style.overflow;
    root?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      root?.removeAttribute('inert');
      document.body.style.overflow = overflow;
      if (restoreFocus.current && trigger?.isConnected) trigger.focus();
    };
  }, [trigger]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const items = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const goToGame = () => {
    restoreFocus.current = false;
    onClose();
    openGame(game.id);
  };

  const channels = data?.game.channels ?? game.channels;
  const venue = data?.venue;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" onKeyDown={onKeyDown}>
      <div aria-hidden className="backdrop-in absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sheet-in relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border-subtle bg-bg-elevated shadow-2xl md:max-w-md md:rounded-3xl"
      >
        <span aria-hidden className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/15 md:hidden" />
        <header className="flex items-start gap-3 px-5 pb-3 pt-3 md:pt-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-[11px] text-text-secondary">{game.competitionName}</p>
            <h2 id={titleId} className="flex items-center gap-2 text-base font-bold">
              <TeamLogo teamId={game.home.id} name={game.home.name} size={22} />
              <span className="truncate">{`${teamLabel(game.home)} - ${teamLabel(game.away)}`}</span>
              <TeamLogo teamId={game.away.id} name={game.away.name} size={22} />
            </h2>
          </div>
          <button
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label={p.close}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-text-secondary transition hover:bg-white/[0.1] hover:text-text-primary"
          >
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-5">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm">
            <dt className="text-text-secondary">{t.game.kickoff}</dt>
            <dd className="min-w-0">
              <span className="ltr-num tabular-nums">{formatKickoff(game.startTime)}</span>
              <span className="text-text-secondary"> · {formatLongDate(game.startTime)}</span>
            </dd>
            {venue && (
              <>
                <dt className="text-text-secondary">{t.game.venue}</dt>
                <dd className="min-w-0 truncate">{venue}</dd>
              </>
            )}
            {channels.length > 0 && (
              <>
                <dt className="text-text-secondary">{t.game.tv}</dt>
                <dd className="flex min-w-0">
                  <ChannelBadge channels={channels} />
                </dd>
              </>
            )}
          </dl>
          {data ? (
            <Content game={game} detail={data} />
          ) : errorStatus !== null ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <p className="text-sm text-text-secondary">{p.loadFailed}</p>
              <button type="button" onClick={reload} className="rounded-full bg-white/[0.06] px-4 py-2 text-sm font-semibold">
                {p.retry}
              </button>
            </div>
          ) : (
            <Skeleton />
          )}
          <button
            type="button"
            onClick={goToGame}
            className="flex items-center justify-center gap-1.5 rounded-full border border-accent-brand/40 bg-accent-brand/15 px-4 py-2.5 text-sm font-semibold text-text-primary transition hover:bg-accent-brand/25 active:scale-[0.98]"
          >
            {p.fullPage}
            <ForwardArrow />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
