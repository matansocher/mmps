import type { CompetitionTableRow, UpcomingMatch } from '@services/scores-365';
import { FAVORITE_TEAM_IDS, ISRAELI_DERBY_TEAM_PAIRS, SPORTS_CALENDAR_COMPETITION_IDS } from '../sports-calendar.config';

export type SportsCalendarCategory = 'favorite-team' | 'world-cup' | 'champions-league' | 'israeli-derby' | 'title-decider' | 'israeli-top-four';

export type SelectedSportsMatch = UpcomingMatch & {
  readonly category: SportsCalendarCategory;
};

function isFavoriteTeamMatch(match: UpcomingMatch): boolean {
  return FAVORITE_TEAM_IDS.has(match.homeTeam.id) || FAVORITE_TEAM_IDS.has(match.awayTeam.id);
}

function isDerby(match: UpcomingMatch): boolean {
  return ISRAELI_DERBY_TEAM_PAIRS.some(([firstTeamId, secondTeamId]) => {
    return (match.homeTeam.id === firstTeamId && match.awayTeam.id === secondTeamId) || (match.homeTeam.id === secondTeamId && match.awayTeam.id === firstTeamId);
  });
}

export function selectSportsCalendarMatches(matches: UpcomingMatch[], table: CompetitionTableRow[] = []): SelectedSportsMatch[] {
  const standingsByTeam = new Map(table.map((row, index) => [row.competitor.id, { position: index + 1, points: row.points }]));

  return matches.flatMap((match): SelectedSportsMatch[] => {
    let category: SportsCalendarCategory;

    if (isFavoriteTeamMatch(match)) {
      category = 'favorite-team';
    } else if (match.competitionId === SPORTS_CALENDAR_COMPETITION_IDS.worldCup) {
      category = 'world-cup';
    } else if (match.competitionId === SPORTS_CALENDAR_COMPETITION_IDS.championsLeague) {
      category = 'champions-league';
    } else if (match.competitionId === SPORTS_CALENDAR_COMPETITION_IDS.israeliPremierLeague && isDerby(match)) {
      category = 'israeli-derby';
    } else {
      const homeStanding = standingsByTeam.get(match.homeTeam.id);
      const awayStanding = standingsByTeam.get(match.awayTeam.id);
      if (
        match.competitionId === SPORTS_CALENDAR_COMPETITION_IDS.israeliPremierLeague &&
        homeStanding?.position <= 2 &&
        awayStanding?.position <= 2 &&
        Math.abs(homeStanding.points - awayStanding.points) <= 3 &&
        match.remainingHomeMatches <= 5 &&
        match.remainingAwayMatches <= 5
      ) {
        category = 'title-decider';
      } else if (match.competitionId === SPORTS_CALENDAR_COMPETITION_IDS.israeliPremierLeague && homeStanding?.position <= 4 && awayStanding?.position <= 4) {
        category = 'israeli-top-four';
      } else {
        return [];
      }
    }

    return [{ ...match, category }];
  });
}
