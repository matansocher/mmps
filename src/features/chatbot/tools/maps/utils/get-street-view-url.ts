type StreetViewOptions = {
  size?: string;
  fov?: number;
  heading?: number;
  pitch?: number;
  scale?: number;
};

export function getStreetViewUrl(location: string | { lat: number; lng: number }, apiKey: string, options: StreetViewOptions = {}): string {
  const size = options.size || '640x640';
  const fov = options.fov || 90;
  const heading = options.heading || 0;
  const pitch = options.pitch || 0;
  const scale = options.scale || 1;

  const locationParam = typeof location === 'string' ? location : `${location.lat},${location.lng}`;

  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${encodeURIComponent(locationParam)}&fov=${fov}&heading=${heading}&pitch=${pitch}&scale=${scale}&key=${apiKey}`;
}
