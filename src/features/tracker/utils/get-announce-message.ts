export function getAnnounceMessage(distance: number) {
  const formatDistance = (distance: number) => '' + (distance < 1000 ? `${distance} מטרים` : `${(distance / 1000).toFixed(2)} קילומטרים`);
  return `אני בדרך ומגיע עוד ${formatDistance(distance)}`;
}
