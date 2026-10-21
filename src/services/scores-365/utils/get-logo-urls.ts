const IMAGE_BASE_URL = 'https://imagecache.365scores.com/image/upload';

export function getTeamLogoUrl(teamId: number, size = 64): string {
  return `${IMAGE_BASE_URL}/f_png,w_${size},h_${size},c_limit,q_auto:eco,d_Competitors:default1.png/Competitors/${teamId}`;
}

export function getCompetitionLogoUrl(competitionId: number, size = 64): string {
  return `${IMAGE_BASE_URL}/f_png,w_${size},h_${size},c_limit,q_auto:eco,d_Competitions:default1.png/Competitions/${competitionId}`;
}
