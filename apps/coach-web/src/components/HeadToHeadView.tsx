import { messages } from '../lib/i18n';
import type { GameSummary, HeadToHead, Team } from '../types';
import { GameSummaryRow } from './GameSummaryRow';
import { TeamLogo } from './TeamLogo';
import { Card, FormBadge, Section } from './ui';

function teamLabel(team: Team): string {
  return team.shortName || team.name;
}

function RecordBar({ headToHead, home, away }: { readonly headToHead: HeadToHead; readonly home: Team; readonly away: Team }) {
  const { homeWins, draws, awayWins } = headToHead.record;
  const total = homeWins + draws + awayWins;
  if (!total) return null;
  const t = messages().h2h;
  const columns = [
    { label: t.wins(teamLabel(home)), value: homeWins, color: 'bg-accent-brand' },
    { label: t.draws, value: draws, color: 'bg-text-muted' },
    { label: t.wins(teamLabel(away)), value: awayWins, color: 'bg-accent-red' },
  ];
  return (
    <div className="flex flex-col gap-2.5 px-4 py-3">
      <div className="grid grid-cols-3 text-center">
        {columns.map((c) => (
          <div key={c.label} className="flex min-w-0 flex-col">
            <span className="score-font text-xl">{c.value}</span>
            <span className="truncate text-caption text-text-muted">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        {columns
          .filter((c) => c.value > 0)
          .map((c) => (
            <span key={c.label} className={c.color} style={{ flexGrow: c.value }} />
          ))}
      </div>
      <p className="text-center text-caption text-text-muted">{t.lastMeetings(total)}</p>
    </div>
  );
}

function scoreLine(game: GameSummary): string {
  return `${game.home.shortName || game.home.name} ${game.home.score ?? ''}-${game.away.score ?? ''} ${game.away.shortName || game.away.name}`;
}

function FormRow({ team, games }: { readonly team: Team; readonly games: readonly GameSummary[] }) {
  if (!games.length) return null;
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <TeamLogo teamId={team.id} name={team.name} size={20} />
      <span className="min-w-0 flex-1 truncate text-sm">{teamLabel(team)}</span>
      <span className="flex gap-0.5">
        {[...games].reverse().map((g) =>
          g.result ? (
            <span key={g.id} title={scoreLine(g)}>
              <FormBadge result={g.result} />
            </span>
          ) : null,
        )}
      </span>
    </div>
  );
}

export function HeadToHeadView({ headToHead, home, away }: { readonly headToHead: HeadToHead; readonly home: Team; readonly away: Team }) {
  const hasForm = headToHead.homeRecent.length > 0 || headToHead.awayRecent.length > 0;
  return (
    <>
      {hasForm && (
        <Section title={messages().h2h.form} right={<span className="text-caption text-text-muted">{messages().h2h.formHint}</span>}>
          <Card className="divide-y divide-border-subtle">
            <FormRow team={home} games={headToHead.homeRecent} />
            <FormRow team={away} games={headToHead.awayRecent} />
          </Card>
        </Section>
      )}
      {headToHead.meetings.length > 0 && (
        <Section title={messages().h2h.title}>
          <Card className="divide-y divide-border-subtle">
            <RecordBar headToHead={headToHead} home={home} away={away} />
            {headToHead.meetings.map((m) => (
              <GameSummaryRow key={m.id} game={{ ...m, result: undefined }} />
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}
