const FALLBACK = '#3B82F6';

const THEMES: Record<number, string> = {
  42: '#1E3A8A', // Ligat HaAl
  49: '#1E3A8A', // Israel FA Cup
  546: '#1E3A8A', // Toto Cup
  572: '#0A2E72', // UEFA Champions League
  573: '#F58220', // UEFA Europa League
  7685: '#00A86B', // UEFA Conference League
  7: '#3D195B', // Premier League
  8: '#C8102E', // FA Cup
  11: '#EE2737', // La Liga
  13: '#FFCD00', // Copa del Rey
  25: '#D20515', // Bundesliga
  28: '#000000', // DFB-Pokal
  17: '#008FD7', // Serie A
  20: '#0066A4', // Coppa Italia
  5930: '#FFCC00', // FIFA World Cup
  5421: '#FFCC00', // World Cup Qualifiers
  6316: '#00529F', // UEFA Euro
  6071: '#00529F', // Euro Qualifiers
  7016: '#003399', // Nations League
  5096: '#1A237E', // Club World Cup
};

export function leagueColor(competitionId: number): string {
  return THEMES[competitionId] ?? FALLBACK;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// White or near-black, whichever reads better on the league colour (WCAG contrast).
export function leagueTextColor(competitionId: number): string {
  const bg = luminance(leagueColor(competitionId));
  const onWhite = 1.05 / (bg + 0.05);
  const onDark = (bg + 0.05) / (luminance('#0a0e14') + 0.05);
  return onWhite >= onDark ? '#ffffff' : '#0a0e14';
}
