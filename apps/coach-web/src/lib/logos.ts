export function teamLogo(teamId: number, size = 68): string {
  return `https://imagecache.365scores.com/image/upload/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/Competitors/${teamId}`;
}

export function athletePhoto(athleteId: number, size = 48): string {
  return `https://imagecache.365scores.com/image/upload/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Athletes:default1.png/Athletes/${athleteId}`;
}
