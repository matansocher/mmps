import axios from 'axios';
import { pick as _pick } from 'lodash';
import { DEFAULT_TIMEZONE } from '@core/config';
import { CompetitionTableDetails } from '../interface';
import { APP_TYPE_ID, COMPETITIONS, COUNTRY_ID, LANGUAGE_ID, SCORES_365_API_URL } from '../scores-365.config';

export async function getCompetitionTable(competitionId: number): Promise<CompetitionTableDetails> {
  const queryParams = {
    appTypeId: `${APP_TYPE_ID}`,
    competitions: competitionId.toString(),
    langId: `${LANGUAGE_ID}`,
    timezoneName: DEFAULT_TIMEZONE,
    userCountryId: `${COUNTRY_ID}`,
    live: 'false',
    withSeasonsFilter: 'false',
  };
  const result = await axios.get(`${SCORES_365_API_URL}/standings?${new URLSearchParams(queryParams)}`);
  const relevantCompetitionData = result.data?.competitions?.find((c) => c.id === competitionId);
  const relevantCompetitionTableData = result.data?.standings?.find((c) => c.competitionId === competitionId);
  if (!relevantCompetitionData || !relevantCompetitionTableData) {
    return undefined;
  }
  const competitionTable = relevantCompetitionTableData.rows.map(({ competitor, points }) => ({ competitor: { id: competitor.id, name: competitor.name }, points }));
  const competitionRawDetails = COMPETITIONS.find((c) => c.id === competitionId);
  const competition = { ..._pick(relevantCompetitionData, ['id', 'name']), icon: competitionRawDetails.icon };
  return { competition, competitionTable } as CompetitionTableDetails;
}
