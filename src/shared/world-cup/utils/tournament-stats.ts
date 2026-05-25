import { Logger } from '@core/utils';
import { fetchRichMatch } from '@shared/coach-api/match-fetcher';
import { getWorldCupFinishedMatches, getWorldCupLiveMatches } from './world-cup-data';
import { WORLD_CUP_TEAMS } from '../teams';

const logger = new Logger('TournamentStats');

export type PlayerStat = {
  readonly playerName: string;
  readonly teamName: string;
  readonly teamFlag: string;
  readonly count: number;
};

export type TournamentStats = {
  readonly topScorers: PlayerStat[];
  readonly topAssisters: PlayerStat[];
  readonly topYellowCards: PlayerStat[];
  readonly topRedCards: PlayerStat[];
};

const GOAL_TYPE_NAME = 'Goal';
const YELLOW_CARD_TYPE_NAME = 'Yellow Card';
const RED_CARD_TYPE_NAME = 'Red Card';
const SECOND_YELLOW_TYPE_NAME = 'Yellow Red Card';

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let statsCache: { data: TournamentStats; ts: number } | null = null;

function getTeamInfo(competitorId: number): { name: string; flag: string } {
  const team = WORLD_CUP_TEAMS.find((t) => t.id === competitorId);
  return team ? { name: team.name, flag: team.flag } : { name: 'לא ידוע', flag: '🏳️' };
}

export async function getTournamentStats(): Promise<TournamentStats> {
  if (statsCache && Date.now() - statsCache.ts < CACHE_TTL_MS) return statsCache.data;

  const [finishedMatches, liveMatches] = await Promise.all([getWorldCupFinishedMatches(), getWorldCupLiveMatches()]);
  const allMatches = [...finishedMatches, ...liveMatches];

  if (allMatches.length === 0) {
    return { topScorers: [], topAssisters: [], topYellowCards: [], topRedCards: [] };
  }

  const scorers = new Map<string, { teamId: number; count: number }>();
  const assisters = new Map<string, { teamId: number; count: number }>();
  const yellowCards = new Map<string, { teamId: number; count: number }>();
  const redCards = new Map<string, { teamId: number; count: number }>();

  // Fetch events for all finished matches in batches of 5
  const batchSize = 5;
  for (let i = 0; i < allMatches.length; i += batchSize) {
    const batch = allMatches.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((m) => fetchRichMatch(m.id).catch(() => null)));

    for (let j = 0; j < results.length; j++) {
      const rich = results[j];
      if (!rich) continue;

      const match = batch[j];
      const homeId = match.homeCompetitor.id;
      const awayId = match.awayCompetitor.id;

      for (const event of rich.events) {
        if (!event.playerName) continue;
        const teamId = event.side === 'home' ? homeId : awayId;
        const key = `${event.playerName}__${teamId}`;

        if (event.typeName === GOAL_TYPE_NAME && event.subTypeName !== 'Own Goal') {
          const existing = scorers.get(key) || { teamId, count: 0 };
          scorers.set(key, { teamId, count: existing.count + 1 });

          // Assist from extraPlayerNames
          if (event.extraPlayerNames?.length) {
            const assistKey = `${event.extraPlayerNames[0]}__${teamId}`;
            const existingAssist = assisters.get(assistKey) || { teamId, count: 0 };
            assisters.set(assistKey, { teamId, count: existingAssist.count + 1 });
          }
        } else if (event.typeName === YELLOW_CARD_TYPE_NAME) {
          const existing = yellowCards.get(key) || { teamId, count: 0 };
          yellowCards.set(key, { teamId, count: existing.count + 1 });
        } else if (event.typeName === RED_CARD_TYPE_NAME || event.typeName === SECOND_YELLOW_TYPE_NAME) {
          const existing = redCards.get(key) || { teamId, count: 0 };
          redCards.set(key, { teamId, count: existing.count + 1 });
        }
      }
    }
  }

  const toSorted = (map: Map<string, { teamId: number; count: number }>): PlayerStat[] => {
    return Array.from(map.entries())
      .map(([key, { teamId, count }]) => {
        const playerName = key.split('__')[0];
        const { name: teamName, flag: teamFlag } = getTeamInfo(teamId);
        return { playerName, teamName, teamFlag, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const data: TournamentStats = {
    topScorers: toSorted(scorers),
    topAssisters: toSorted(assisters),
    topYellowCards: toSorted(yellowCards),
    topRedCards: toSorted(redCards),
  };

  statsCache = { data, ts: Date.now() };
  logger.log(`Tournament stats cached: ${data.topScorers.length} scorers, ${data.topAssisters.length} assisters`);
  return data;
}
