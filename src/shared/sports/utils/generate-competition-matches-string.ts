import { toZonedTime } from 'date-fns-tz';
import { DEFAULT_TIMEZONE } from '@core/config';
import { type CompetitionDetails, COMPETITIONS, type MatchDetails } from '@services/scores-365';

export function generateCompetitionMatchesString({ competition, matches }: CompetitionDetails): string {
  const leagueName = competition.name;
  const matchResults = matches?.map((matchDetails) => getSingleMatchString(matchDetails)).join('\n') || [];
  const relevantCompetition = COMPETITIONS.find((c) => c.id === competition.id);
  const competitionLogo = relevantCompetition?.icon || '🏟️';
  return `המחזור הקרוב ב${leagueName} ${competitionLogo}\n${matchResults}`;
}

function getSingleMatchString(matchDetails: MatchDetails): string {
  const { startTime, homeCompetitor, awayCompetitor, gameTime, statusText, channel } = matchDetails;
  const zonedTime = toZonedTime(new Date(startTime), DEFAULT_TIMEZONE);
  const displayStartDate = `${zonedTime.getDate()}/${zonedTime.getMonth() + 1}/${zonedTime.getFullYear()}`;
  const displayStartTime = zonedTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const matchEnded = statusText.includes('הסתיים');
  const result = [
    '⚽️',
    displayStartDate,
    displayStartTime,
    homeCompetitor.name,
    homeCompetitor.score === -1 ? '' : homeCompetitor.score,
    '-',
    awayCompetitor.score === -1 ? '' : awayCompetitor.score,
    awayCompetitor.name,
    '-',
    matchEnded || gameTime === -1 ? '' : gameTime,
    statusText === 'טרם החל' || matchEnded ? '' : statusText,
    channel ? `(*${channel}*)` : '',
    // `<a href="https://google.com">google</a>`,
  ]
    .join(' ')
    .replaceAll('  ', ' ')
    .replaceAll('  ', ' ')
    .replaceAll('  ', ' ')
    .trim();
  return result.endsWith(' -') ? result.slice(0, -2) : result;
}
