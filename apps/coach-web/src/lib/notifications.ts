import type { IconName } from '../components/Icon';
import type { EventType, Game, GameEvent, Side } from '../types';
import { EVENT_META, eventText, formatKickoff } from './format';

export type GameNotification = {
  readonly key: string;
  readonly gameId: number;
  readonly competitionId: number;
  readonly icon: IconName;
  readonly title: string;
  readonly text?: string;
  readonly minuteDisplay?: string;
  readonly game: Pick<Game, 'home' | 'away' | 'competitionName' | 'status'>;
};

type Score = { readonly home: number; readonly away: number };
type GoalMoment = { readonly before: Score; readonly after: Score; readonly trailedBefore: boolean; readonly playerGoalCount: number };

const LATE_MINUTE = 85;
const CONSOLATION_MINUTE = 80;
const PLAYERS_ON_PITCH = 11;

function gameSnapshot(game: Game): GameNotification['game'] {
  return { home: game.home, away: game.away, competitionName: game.competitionName, status: game.status };
}

function teamName(game: Game, side: Side): string {
  return game[side].shortName || game[side].name;
}

function other(side: Side): Side {
  return side === 'home' ? 'away' : 'home';
}

function isOwnGoal(event: GameEvent): boolean {
  return /own/i.test(event.detail ?? '');
}

function byMinute(events: readonly GameEvent[]): GameEvent[] {
  return events.map((event, index) => ({ event, index })).sort((a, b) => a.event.minute - b.event.minute || a.index - b.index).map(({ event }) => event);
}

// Replays the goals from 0-0. Returns null when the replay doesn't reach the actual score (filtered or missing events),
// so callers fall back to generic titles instead of guessing.
function replayGoals(game: Game): Map<string, GoalMoment> | null {
  const moments = new Map<string, GoalMoment>();
  const playerGoals = new Map<string, number>();
  const trailed: Record<Side, boolean> = { home: false, away: false };
  let score: Score = { home: 0, away: 0 };

  for (const goal of byMinute(game.events.filter((e) => e.type === 'goal'))) {
    const before = score;
    score = { ...score, [goal.side]: score[goal.side] + 1 };
    const playerKey = goal.playerAthleteId ? `${goal.playerAthleteId}` : goal.playerName;
    const playerGoalCount = playerKey && !isOwnGoal(goal) ? (playerGoals.get(playerKey) ?? 0) + 1 : 0;
    if (playerKey && playerGoalCount) playerGoals.set(playerKey, playerGoalCount);
    moments.set(goal.key, { before, after: score, trailedBefore: trailed[goal.side], playerGoalCount });
    trailed.home ||= score.home < score.away;
    trailed.away ||= score.away < score.home;
  }

  return score.home === game.home.score && score.away === game.away.score ? moments : null;
}

function goalTitle(game: Game, event: GameEvent, moment: GoalMoment): string {
  const team = teamName(game, event.side);
  const scored = moment.after[event.side];
  const conceded = moment.after[other(event.side)];
  const isLate = event.minute >= LATE_MINUTE;

  if (scored === conceded) return isLate ? 'Late equaliser!' : 'Equaliser!';
  if (scored === conceded + 1) {
    if (moment.trailedBefore) return `Comeback! ${team} lead`;
    if (isLate) return `Late goal! ${team} lead`;
    return scored === 1 ? `${team} take the lead` : `${team} back in front`;
  }
  if (scored > conceded) return `${team} extend the lead`;
  if (conceded - scored >= 2 && event.minute >= CONSOLATION_MINUTE) return `Consolation for ${team}`;
  return `${team} pull one back`;
}

function goalText(event: GameEvent, moment: GoalMoment): string {
  const text = eventText(event);
  if (moment.playerGoalCount === 2) return `${text} · brace`;
  if (moment.playerGoalCount >= 3) return `${text} · hat-trick!`;
  return text;
}

function redCardTitle(game: Game, event: GameEvent): string {
  const reds = byMinute(game.events.filter((e) => e.type === 'redCard'));
  const upTo = reds.slice(0, reds.findIndex((e) => e.key === event.key) + 1);
  const count = (side: Side) => upTo.filter((e) => e.side === side).length;
  const own = count(event.side);
  const opponent = count(other(event.side));
  if (own === opponent) return `Both teams down to ${PLAYERS_ON_PITCH - own}`;
  return `${teamName(game, event.side)} down to ${PLAYERS_ON_PITCH - own}`;
}

function scoreAt(goals: Map<string, GoalMoment>, game: Game, minute: number): Score {
  let score: Score = { home: 0, away: 0 };
  for (const goal of game.events) {
    const moment = goal.type === 'goal' && goal.minute <= minute ? goals.get(goal.key) : undefined;
    if (moment && moment.after.home + moment.after.away > score.home + score.away) score = moment.after;
  }
  return score;
}

function contextual(game: Game, event: GameEvent, goals: Map<string, GoalMoment> | null): { readonly title: string; readonly text: string } | null {
  if (event.type === 'goal') {
    const moment = goals?.get(event.key);
    return moment ? { title: goalTitle(game, event, moment), text: goalText(event, moment) } : null;
  }
  if (event.type === 'redCard') return { title: redCardTitle(game, event), text: eventText(event) };
  if (event.type === 'missedPenalty' && goals) {
    const score = scoreAt(goals, game, event.minute);
    return { title: `${teamName(game, event.side)} miss a penalty`, text: `${eventText(event)} · still ${score.home}-${score.away}` };
  }
  return null;
}

function fullTimeTitle(game: Game): string {
  const home = game.home.score ?? 0;
  const away = game.away.score ?? 0;
  if (home === away) return 'Full time – draw';
  return `Full time – ${teamName(game, home > away ? 'home' : 'away')} win`;
}

// Compares two consecutive polls and returns what changed: lineups, kick-offs, new events (of the selected types) and full-times.
export function diffGames(previous: readonly Game[], next: readonly Game[], eventTypes: readonly EventType[]): GameNotification[] {
  const notifyTypes = new Set(eventTypes);
  const previousById = new Map(previous.map((g) => [g.id, g]));
  const notifications: GameNotification[] = [];

  for (const game of next) {
    const before = previousById.get(game.id);
    if (!before) continue;
    const base = { gameId: game.id, competitionId: game.competitionId, game: gameSnapshot(game) };

    if (game.status === 'scheduled' && !before.lineupsConfirmed && game.lineupsConfirmed) {
      notifications.push({ ...base, key: `${game.id}:lineups`, icon: 'lineups', title: 'Lineups confirmed', text: `Kick-off ${formatKickoff(game.startTime)}` });
    }

    if (before.status === 'scheduled' && game.status === 'live') {
      notifications.push({ ...base, key: `${game.id}:kickoff`, icon: 'kickoff', title: 'Kick-off' });
    }

    const seen = new Set(before.events.map((e) => e.key));
    const newEvents = game.events.filter((e) => !seen.has(e.key) && notifyTypes.has(e.type));
    const goals = newEvents.some((e) => e.type === 'goal' || e.type === 'missedPenalty') ? replayGoals(game) : null;
    for (const event of newEvents) {
      const meta = EVENT_META[event.type];
      const context = contextual(game, event, goals);
      notifications.push({
        ...base,
        key: event.key,
        icon: meta.icon,
        title: context?.title ?? meta.title,
        text: context?.text ?? eventText(event),
        minuteDisplay: event.minuteDisplay,
      });
    }

    if (before.status === 'live' && game.status === 'finished') {
      notifications.push({ ...base, key: `${game.id}:fulltime`, icon: 'fulltime', title: fullTimeTitle(game) });
    }
  }
  return notifications;
}
