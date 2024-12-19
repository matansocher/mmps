import { Competition, MatchDetails } from '@services/scores-365/interface';
import { COMPETITION_LOGOS_MAP } from '@services/scores-365/scores-365.config';

export function generateMatchResultsString(data: { competition: Competition; matches: MatchDetails[] }[]): string {
  return data
    .map(({ competition, matches }) => {
      const leagueName = competition.name;
      const matchResults = matches.map((matchDetails) => getSingleMatchString(matchDetails)).join('\n');
      const competitionLogo = COMPETITION_LOGOS_MAP[competition.id] || '🏟️';
      return `${leagueName} ${competitionLogo}\n${matchResults}`;
    })
    .join('\n\n');
}

export function getSingleMatchString(matchDetails: MatchDetails): string {
  const { homeCompetitor, awayCompetitor, gameTime, statusText } = matchDetails;
  const result = [
    '⚽️',
    homeCompetitor.name,
    homeCompetitor.score === -1 ? '' : homeCompetitor.score,
    '-',
    awayCompetitor.score === -1 ? '' : awayCompetitor.score,
    awayCompetitor.name,
    '-',
    statusText === 'הסתיים' || gameTime === -1 ? '' : gameTime,
    statusText === 'טרם החל' ? '' : statusText,
  ]
    .join(' ')
    .replaceAll('  ', ' ')
    .trim();
  return result.endsWith(' -') ? result.slice(0, -2) : result;
}
