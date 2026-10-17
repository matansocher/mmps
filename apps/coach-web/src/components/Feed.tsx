import { EVENT_META, eventDetail, formatKickoff } from '../lib/format';
import { leagueColor } from '../lib/league-themes';
import type { FeedItem } from '../types';
import { TeamLogo } from './TeamLogo';

function FeedRow({ item }: { readonly item: FeedItem }) {
  const meta = EVENT_META[item.type];
  const scoringTeam = item.side === 'home' ? item.home : item.away;
  const detail = eventDetail(item);
  const isGoal = item.type === 'goal';
  return (
    <li className={`flex gap-2.5 rounded-lg px-2.5 py-2 ${isGoal ? 'bg-accent-win/5' : ''}`}>
      <div className="flex w-10 shrink-0 flex-col items-center gap-0.5">
        <span className="text-lg leading-none">{meta.icon}</span>
        <span className="score-font text-[11px] text-text-muted" dir="ltr">
          {item.minuteDisplay}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-1.5 text-sm">
          <TeamLogo teamId={scoringTeam.id} name={scoringTeam.name} size={16} />
          <span className="min-w-0 truncate font-semibold text-text-primary">
            {item.playerName ?? meta.label}
            {item.type === 'substitution' && item.assistName && <span className="font-normal text-text-secondary"> ⇄ {item.assistName}</span>}
            {isGoal && item.assistName && <span className="font-normal text-text-muted"> · בישול {item.assistName}</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="min-w-0 truncate">
            {item.home.shortName || item.home.name}{' '}
            <span className="score-font text-text-primary" dir="ltr">
              {item.home.score ?? '-'}-{item.away.score ?? '-'}
            </span>{' '}
            {item.away.shortName || item.away.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: leagueColor(item.competitionId) }} />
          <span className="truncate">{item.competitionName}</span>
          {detail && <span className="truncate">· {detail}</span>}
          <span className="ms-auto shrink-0">~{formatKickoff(item.estimatedAt)}</span>
        </div>
      </div>
    </li>
  );
}

export function Feed({ items }: { readonly items: FeedItem[] }) {
  if (!items.length) return <p className="px-3 py-8 text-center text-sm text-text-muted">עוד לא היו אירועים היום</p>;
  return (
    <ul className="flex flex-col divide-y divide-border-subtle/60">
      {items.map((item) => (
        <FeedRow key={item.key} item={item} />
      ))}
    </ul>
  );
}
