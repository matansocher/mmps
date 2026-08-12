import axios from 'axios';
import { DEFAULT_TIMEZONE } from '@core/config';
import type { UpcomingMatch } from '../interface';
import { APP_TYPE_ID, COMPETITION_IDS_MAP, COMPETITIONS, COUNTRY_ID, ENGLISH_LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

type RawFixture = {
  readonly id: number;
  readonly competitionId: number;
  readonly competitionDisplayName?: string;
  readonly stageName?: string;
  readonly startTime: string;
  readonly statusGroup: number;
  readonly venue?: {
    readonly name?: string;
  };
  readonly homeCompetitor: {
    readonly id: number;
    readonly name: string;
  };
  readonly awayCompetitor: {
    readonly id: number;
    readonly name: string;
  };
};

type CompetitionFixtures = {
  readonly sourceCompetitionId: number;
  readonly fixtures: RawFixture[];
};

const SCHEDULED_STATUS_GROUP = 2;

async function getCompetitionFixtures(sourceCompetitionId: number): Promise<CompetitionFixtures> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    competitions: sourceCompetitionId.toString(),
    langId: `${ENGLISH_LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
  };
  const response = await axios.get(`${SCORES_365_API_URL}/games/fixtures?${new URLSearchParams(queryParams)}`);
  if (!Array.isArray(response.data?.games)) {
    throw new Error(`Invalid fixtures response for competition ${sourceCompetitionId}`);
  }
  return { sourceCompetitionId, fixtures: response.data.games };
}

function countRemainingLeagueMatches(fixtures: CompetitionFixtures[]): Map<number, number> {
  const remainingByTeam = new Map<number, number>();
  const seenFixtureIds = new Set<number>();
  for (const { sourceCompetitionId, fixtures: competitionFixtures } of fixtures) {
    if (sourceCompetitionId !== COMPETITION_IDS_MAP.LIGAT_HAAL) {
      continue;
    }
    for (const fixture of competitionFixtures) {
      if (fixture.statusGroup !== SCHEDULED_STATUS_GROUP || fixture.competitionId !== COMPETITION_IDS_MAP.LIGAT_HAAL || seenFixtureIds.has(fixture.id)) {
        continue;
      }
      seenFixtureIds.add(fixture.id);
      remainingByTeam.set(fixture.homeCompetitor.id, (remainingByTeam.get(fixture.homeCompetitor.id) ?? 0) + 1);
      remainingByTeam.set(fixture.awayCompetitor.id, (remainingByTeam.get(fixture.awayCompetitor.id) ?? 0) + 1);
    }
  }
  return remainingByTeam;
}

export async function getUpcomingMatches(startDate: string, endDate: string): Promise<UpcomingMatch[]> {
  const fixturesByCompetition = await Promise.all(COMPETITIONS.map(({ id }) => getCompetitionFixtures(id)));
  const remainingByTeam = countRemainingLeagueMatches(fixturesByCompetition);
  const matchesById = new Map<number, UpcomingMatch>();

  for (const { sourceCompetitionId, fixtures } of fixturesByCompetition) {
    for (const fixture of fixtures) {
      const fixtureDate = fixture.startTime.slice(0, 10);
      if (fixture.statusGroup !== SCHEDULED_STATUS_GROUP || fixtureDate < startDate || fixtureDate > endDate || matchesById.has(fixture.id)) {
        continue;
      }
      matchesById.set(fixture.id, {
        id: fixture.id,
        sourceCompetitionId,
        competitionId: fixture.competitionId,
        competitionName: fixture.competitionDisplayName ?? `Competition ${fixture.competitionId}`,
        stage: fixture.stageName,
        startTime: fixture.startTime,
        venue: fixture.venue?.name,
        homeTeam: { id: fixture.homeCompetitor.id, name: fixture.homeCompetitor.name },
        awayTeam: { id: fixture.awayCompetitor.id, name: fixture.awayCompetitor.name },
        remainingHomeMatches: remainingByTeam.get(fixture.homeCompetitor.id) ?? 0,
        remainingAwayMatches: remainingByTeam.get(fixture.awayCompetitor.id) ?? 0,
      });
    }
  }

  return [...matchesById.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}
