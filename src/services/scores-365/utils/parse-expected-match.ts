import { pick as _pick } from 'lodash';
import { ExpectedMatch, MatchDetails, Team } from '../interface';

export function parseExpectedMatch(match: ExpectedMatch): MatchDetails {
  const { id, startTime, statusText, gameTime, venue, homeCompetitor, awayCompetitor, tvNetworks = [] } = match;
  const channel = tvNetworks[0]?.name;
  return {
    id,
    startTime,
    statusText,
    gameTime,
    venue: venue?.name,
    homeCompetitor: _pick(homeCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
    awayCompetitor: _pick(awayCompetitor, ['id', 'name', 'symbolicName', 'score', 'nameForURL', 'color']) as Team,
    ...(channel ? { channel } : {}),
  } as MatchDetails;
}
