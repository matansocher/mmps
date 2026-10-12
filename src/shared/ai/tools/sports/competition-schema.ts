import { z } from 'zod';
import { COMPETITION_IDS_MAP } from '@services/scores-365';

type CompetitionKey = keyof typeof COMPETITION_IDS_MAP;

const COMPETITION_KEYS = Object.keys(COMPETITION_IDS_MAP) as [CompetitionKey, ...CompetitionKey[]];

export const competitionSchema = z.enum(COMPETITION_KEYS).describe('The competition, e.g. PREMIER_LEAGUE, LA_LIGA, LIGAT_HAAL, CHAMPIONS_LEAGUE');

export function getCompetitionKey(competitionId: number): CompetitionKey | undefined {
  return COMPETITION_KEYS.find((key) => COMPETITION_IDS_MAP[key] === competitionId);
}
