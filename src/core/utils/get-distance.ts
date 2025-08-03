type Location = {
  lat: number;
  lon: number;
};

const R = 6371e3; // Earth radius in meters

// Distance in meters
export function getDistance(source: Location, target: Location): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const dLat = toRad(target.lat - source.lat);
  const dLon = toRad(target.lon - source.lon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(source.lat)) * Math.cos(toRad(target.lat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.floor(R * c);
}
