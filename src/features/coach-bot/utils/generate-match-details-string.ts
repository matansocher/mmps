import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { Competition, MatchDetails } from '@services/scores-365/interface';
import { COMPETITIONS } from '@services/scores-365/scores-365.config';

export function generateMatchResultsString(data: { competition: Competition; matches: MatchDetails[] }[]): string {
  return data
    .map(({ competition, matches }) => {
      const leagueName = competition.name;
      const matchResults = matches.map((matchDetails) => getSingleMatchString(matchDetails)).join('\n');
      const relevantCompetition = COMPETITIONS.find((c) => c.id === competition.id);
      const competitionLogo = relevantCompetition.icon || '🏟️';
      return `${leagueName} ${competitionLogo}\n${matchResults}`;
    })
    .join('\n\n');
}

export function getSingleMatchString(matchDetails: MatchDetails): string {
  const { startTime, homeCompetitor, awayCompetitor, gameTime, statusText, channel } = matchDetails;
  const displayStartTime = toZonedTime(new Date(startTime), DEFAULT_TIMEZONE).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const matchEnded = statusText.includes('הסתיים');
  const result = [
    '⚽️',
    displayStartTime,
    homeCompetitor.name,
    homeCompetitor.score === -1 ? '' : homeCompetitor.score,
    '-',
    awayCompetitor.score === -1 ? '' : awayCompetitor.score,
    awayCompetitor.name,
    '-',
    matchEnded || gameTime === -1 ? '' : gameTime,
    statusText === 'טרם החל' || matchEnded ? '' : statusText,
    channel ? `(<b>${channel}</b>)` : '',
    // `<a href="https://google.com">google</a>`,
  ]
    .join(' ')
    .replaceAll('  ', ' ')
    .replaceAll('  ', ' ')
    .replaceAll('  ', ' ')
    .trim();
  return result.endsWith(' -') ? result.slice(0, -2) : result;
}
