import { generateMatchCardsImage, upcomingMatchesToCardGroups } from '@shared/sports';
import type { MatchCard, MatchCardGroup } from '@shared/sports';
import type { ImagePreview } from './types';

function card(id: number, overrides: Partial<MatchCard>): MatchCard {
  return { id, date: '2026-10-19', time: '20:00', home: '', away: '', homeScore: null, awayScore: null, status: 'scheduled', minute: null, channel: null, ...overrides };
}

const HEBREW_DAY: readonly MatchCardGroup[] = [
  {
    competition: 'ליגת העל',
    matches: [
      card(1, { time: '18:00', home: 'מכבי תל אביב', away: 'הפועל באר שבע', homeScore: 2, awayScore: 1, status: 'finished' }),
      card(2, { time: '19:30', home: 'מכבי חיפה', away: 'בית"ר ירושלים', homeScore: 1, awayScore: 1, status: 'live', minute: 67 }),
      card(3, { time: '20:30', home: 'הפועל תל אביב', away: 'מכבי נתניה', channel: 'ספורט 5' }),
    ],
  },
  {
    competition: 'פרמייר ליג',
    matches: [
      card(4, { time: '17:00', home: 'ארסנל', away: 'צ׳לסי', homeScore: 0, awayScore: 3, status: 'finished' }),
      card(5, { time: '22:00', home: 'ברייטון אנד הוב אלביון', away: 'וולברהמפטון וונדררס', channel: 'ONE' }),
      card(6, { date: '2026-10-20', time: '22:00', home: 'ליברפול', away: 'מנצ׳סטר סיטי', channel: 'ONE' }),
    ],
  },
];

const team = (name: string) => ({ id: 0, name });

const SPORTS_CALENDAR = upcomingMatchesToCardGroups([
  { id: 11, competitionName: 'LaLiga', startTime: '2026-10-19T19:00:00Z', homeTeam: team('Real Madrid'), awayTeam: team('Barcelona') },
  { id: 12, competitionName: 'Champions League', startTime: '2026-10-21T19:00:00Z', homeTeam: team('Bayern Munich'), awayTeam: team('Real Madrid') },
  { id: 13, competitionName: 'Ligat Haal', startTime: '2026-10-20T17:30:00Z', homeTeam: team('Maccabi Tel Aviv'), awayTeam: team("Hapoel Be'er Sheva") },
]);

export const FOOTBALL_PREVIEWS: readonly ImagePreview[] = [
  { name: 'football-matches-he', render: () => generateMatchCardsImage(HEBREW_DAY, 'he') },
  { name: 'football-sports-calendar-en', render: () => generateMatchCardsImage(SPORTS_CALENDAR, 'en') },
];
