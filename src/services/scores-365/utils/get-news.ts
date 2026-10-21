import type { ScoresNews, ScoresNewsFilter, ScoresNewsItem, ScoresNewsSource } from '../interface';
import { SCORES_365_API_URL } from '../scores-365.config';
import { scoresQueryParams } from './query-params';
import { scores365Get } from './scores-365-get';

// 365Scores returns only the latest few items (currently 3) and ignores paging params.
export async function getNews(filter: ScoresNewsFilter, langId?: number): Promise<ScoresNews> {
  const res = await scores365Get<{ news?: ScoresNewsItem[]; newsSources?: ScoresNewsSource[] }>(`${SCORES_365_API_URL}/news/?${scoresQueryParams({ [filter.type]: `${filter.id}` }, langId)}`);
  return { news: res.data?.news ?? [], sources: res.data?.newsSources ?? [] };
}
