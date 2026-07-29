import { EA_FC_FIFA_VERSION, SOFIFA_CDN_BASE } from '../ea-fc-data.config';

// Player face: https://cdn.sofifa.net/players/{id[:3]}/{id[3:6]}/26_120.png
// id is zero-padded to at least 6 digits, then split 3/3 (e.g. 158023 -> 158/023).
export function buildPlayerFaceUrl(eaPlayerId: number, size: 120 | 240 = 120): string {
  const padded = String(eaPlayerId).padStart(6, '0');
  const head = padded.slice(0, 3);
  const tail = padded.slice(3, 6);
  return `${SOFIFA_CDN_BASE}/players/${head}/${tail}/${EA_FC_FIFA_VERSION}_${size}.png`;
}

// Team logo: https://cdn.sofifa.net/teams/{teamId}/60.png
export function buildTeamLogoUrl(eaTeamId: number, size: 60 | 120 = 60): string {
  return `${SOFIFA_CDN_BASE}/teams/${eaTeamId}/${size}.png`;
}

// Nation flag: https://cdn.sofifa.net/flags/{nationalityId}.png
export function buildFlagUrl(nationalityId: number): string {
  return `${SOFIFA_CDN_BASE}/flags/${nationalityId}.png`;
}
