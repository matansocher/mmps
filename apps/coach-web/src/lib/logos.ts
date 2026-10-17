const IMAGE_BASE = 'https://imagecache.365scores.com/image/upload';

export function teamLogo(teamId: number, size = 40): string {
  return `${IMAGE_BASE}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/Competitors/${teamId}`;
}

export function competitionLogo(competitionId: number, size = 32): string {
  return `${IMAGE_BASE}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Countries:round:15.png/Competitions/${competitionId}`;
}

export function athletePhoto(athleteId: number, size = 48): string {
  return `${IMAGE_BASE}/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Athletes:default1.png/Athletes/${athleteId}`;
}

export function tvChannelLogo(channelId: number, height = 20): string {
  // e_trim crops the padding some channel logos ship with, so they all fill the same height.
  return `${IMAGE_BASE}/e_trim/f_png,h_${height},c_limit,q_auto:eco,dpr_2/TvNetworks/${channelId}`;
}
