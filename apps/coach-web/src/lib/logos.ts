const IMAGE_BASE = 'https://imagecache.365scores.com/image/upload';

export function teamLogo(teamId: number, size = 40): string {
  return `${IMAGE_BASE}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/Competitors/${teamId}`;
}

export function competitionLogo(competitionId: number, size = 32): string {
  return `${IMAGE_BASE}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Countries:round:15.png/Competitions/${competitionId}`;
}
