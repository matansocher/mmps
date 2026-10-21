import type { ScoresGame } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

type GamesPage = { readonly games?: ScoresGame[]; readonly paging?: { readonly previousPage?: string } };

// `previousPages` follows 365's paging links backwards so a round split across pages comes back whole.
export async function getCompetitionGames(competitionId: number, kind: 'results' | 'fixtures', langId?: number, previousPages = 0): Promise<ScoresGame[]> {
  const first = await scores365Get<GamesPage>(`${SCORES_365_API_URL}/games/${kind}/?${scoresQueryParams({ competitions: `${competitionId}`, showOdds: 'false' }, langId)}`);
  const games = [...(first.data?.games ?? [])];
  let previous = first.data?.paging?.previousPage;
  for (let page = 0; page < previousPages && previous; page++) {
    const res = await scores365Get<GamesPage>(new URL(previous, SCORES_365_API_URL).toString());
    games.push(...(res.data?.games ?? []));
    previous = res.data?.paging?.previousPage;
  }
  return games;
}
