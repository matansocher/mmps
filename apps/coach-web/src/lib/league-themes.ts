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

const BASE = '#0a0e14';
const MIN_CONTRAST = 3;

// The league's brand colour as-is, for fills that pair it with leagueTextColor.
export function leagueFillColor(competitionId: number): string {
  return THEMES[competitionId] ?? FALLBACK;
}

// Brand colour lifted toward white until it reaches 3:1 against the dark base, so dark leagues stay visible as accents.
export function leagueColor(competitionId: number): string {
  return liftColor(leagueFillColor(competitionId));
}

function contrastOnBase(hex: string): number {
  return (luminance(hex) + 0.05) / (luminance(BASE) + 0.05);
}

function mixWithWhite(hex: string, amount: number): string {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

const lifted = new Map<string, string>();

export function liftColor(hex: string): string {
  const cached = lifted.get(hex);
  if (cached) return cached;
  let color = hex;
  for (let amount = 0.05; contrastOnBase(color) < MIN_CONTRAST && amount <= 1; amount += 0.05) color = mixWithWhite(hex, amount);
  lifted.set(hex, color);
  return color;
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
  const bg = luminance(leagueFillColor(competitionId));
  const onWhite = 1.05 / (bg + 0.05);
  const onDark = (bg + 0.05) / (luminance(BASE) + 0.05);
  return onWhite >= onDark ? '#ffffff' : '#0a0e14';
}

const HOME_FALLBACK = '#3b82f6';
const AWAY_FALLBACK = '#e2e8f0';
const MIN_TEAM_DISTANCE = 120;

function isHex(color: string | undefined): color is string {
  return !!color && /^#[0-9a-f]{6}$/i.test(color);
}

function distance(a: string, b: string): number {
  return Math.hypot(...[1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16) - parseInt(b.slice(i, i + 2), 16)));
}

// Home and away accent colours for one game: each team's own colour lifted for contrast; if they clash, away falls back to off-white.
export function teamColors(home: string | undefined, away: string | undefined): { readonly home: string; readonly away: string } {
  const homeColor = liftColor(isHex(home) ? home : HOME_FALLBACK);
  const awayColor = isHex(away) ? liftColor(away) : AWAY_FALLBACK;
  return { home: homeColor, away: distance(homeColor, awayColor) < MIN_TEAM_DISTANCE ? AWAY_FALLBACK : awayColor };
}
