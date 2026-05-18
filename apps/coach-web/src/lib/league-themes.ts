const FALLBACK = '#3B82F6';

const THEMES: Record<number, string> = {
  42: '#1E3A8A',     // Ligat HaAl
  49: '#1E3A8A',     // Israel FA Cup
  546: '#1E3A8A',    // Toto Cup
  572: '#0A2E72',    // UEFA Champions League
  573: '#F58220',    // UEFA Europa League
  7685: '#00A86B',   // UEFA Conference League
  7: '#3D195B',      // Premier League
  8: '#C8102E',      // FA Cup
  11: '#EE2737',     // La Liga
  13: '#FFCD00',     // Copa del Rey
  25: '#D20515',     // Bundesliga
  28: '#000000',     // DFB-Pokal
  17: '#008FD7',     // Serie A
  20: '#0066A4',     // Coppa Italia
  5930: '#FFCC00',   // FIFA World Cup
  5421: '#FFCC00',   // World Cup Qualifiers
  6316: '#00529F',   // UEFA Euro
  6071: '#00529F',   // Euro Qualifiers
  7016: '#003399',   // Nations League
  5096: '#1A237E',   // Club World Cup
};

export function leagueColor(competitionId: number): string {
  return THEMES[competitionId] ?? FALLBACK;
}
