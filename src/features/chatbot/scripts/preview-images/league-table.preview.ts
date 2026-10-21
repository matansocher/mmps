import type { CompetitionTableToolRow } from '@shared/ai/tools';
import { buildLeagueTableImage } from '../../tool-images';
import type { ImagePreview } from './types';

const ZONES = {
  cl: { zone: 'ליגת האלופות', zoneColor: '#F5CB25' },
  el: { zone: 'הליגה האירופית', zoneColor: '#23EBE4' },
  relegation: { zone: 'ירידה', zoneColor: '#E61034' },
} as const;

const row = (
  position: number,
  team: string,
  played: number,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number,
  points: number,
  zone: { readonly zone: string; readonly zoneColor: string } = undefined,
): CompetitionTableToolRow => ({ position, team, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference: goalsFor - goalsAgainst, points, ...zone });

const PREMIER_LEAGUE: readonly CompetitionTableToolRow[] = [
  row(1, "מנצ'סטר סיטי", 7, 7, 0, 0, 19, 7, 21, ZONES.cl),
  row(2, 'ארסנל', 7, 6, 0, 1, 11, 5, 18, ZONES.cl),
  row(3, 'ברייטון', 7, 5, 1, 1, 23, 5, 16, ZONES.cl),
  row(4, "צ'לסי", 7, 4, 1, 2, 17, 13, 13, ZONES.cl),
  row(5, 'ליברפול', 7, 3, 3, 1, 9, 8, 12, ZONES.el),
  row(6, 'ברנטפורד', 7, 2, 4, 1, 13, 8, 10),
  row(7, 'לידס יונייטד', 7, 2, 4, 1, 9, 6, 10),
  row(8, 'אברטון', 7, 2, 4, 1, 8, 7, 10),
  row(9, 'האל סיטי', 7, 2, 3, 2, 8, 7, 9),
  row(10, "איפסוויץ'", 7, 3, 0, 4, 11, 15, 9),
  row(11, 'ניוקאסל יונייטד', 7, 2, 2, 3, 10, 14, 8),
  row(12, 'אסטון וילה', 7, 2, 2, 3, 7, 11, 8),
  row(13, "מנצ'סטר יונייטד", 7, 1, 4, 2, 10, 10, 7),
  row(14, 'קריסטל פאלאס', 7, 2, 1, 4, 9, 17, 7),
  row(15, 'בורנמות׳', 7, 1, 3, 3, 9, 13, 6),
  row(16, 'קובנטרי', 6, 2, 0, 4, 5, 11, 6),
  row(17, 'פולהאם', 7, 1, 2, 4, 7, 10, 5),
  row(18, 'נוטינגהאם פורסט', 7, 1, 2, 4, 5, 9, 5, ZONES.relegation),
  row(19, 'סנדרלנד', 7, 1, 1, 5, 6, 14, 4, ZONES.relegation),
  row(20, 'טוטנהאם', 6, 0, 3, 3, 3, 9, 3, ZONES.relegation),
];

const NO_ZONES = PREMIER_LEAGUE.slice(0, 10).map(({ zone: _zone, zoneColor: _zoneColor, ...rest }) => rest);

const toolResults = (competition: string, table: readonly CompetitionTableToolRow[]) => [{ toolName: 'competition_table', data: { competition, table } }];

export const LEAGUE_TABLE_PREVIEWS: readonly ImagePreview[] = [
  { name: 'league-table-he', render: () => buildLeagueTableImage(toolResults('פרמייר ליג', PREMIER_LEAGUE), "מנצ'סטר סיטי בפסגה עם 21 נקודות. ארסנל שנייה עם 18.") },
  { name: 'league-table-en', render: () => buildLeagueTableImage(toolResults('Premier League', PREMIER_LEAGUE), 'Manchester City lead with 21 points, 3 ahead of Arsenal.') },
  { name: 'league-table-fallback', render: () => buildLeagueTableImage(toolResults('ליגת העל', NO_ZONES), 'הנה הטבלה') },
];
