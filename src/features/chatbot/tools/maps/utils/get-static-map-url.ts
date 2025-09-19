type StaticMapOptions = {
  size?: string;
  zoom?: number;
  scale?: number;
  label?: string;
};

export function getStaticMapUrl(location: string | { lat: number; lng: number }, apiKey: string, options: StaticMapOptions = {}): string {
  const size = options.size || '640x640';
  const zoom = typeof options.zoom === 'number' ? options.zoom : 16;
  const scale = options.scale || 1;
  const markerLabel = options.label || 'A';

  // location can be either {lat, lng} or a place name string
  let centerParam: string;
  let markerParam: string;

  if (typeof location === 'string') {
    // Use place name directly
    centerParam = encodeURIComponent(location);
    markerParam = `color:red%7Clabel:${encodeURIComponent(markerLabel)}%7C${encodeURIComponent(location)}`;
  } else {
    // Use coordinates
    centerParam = `${location.lat},${location.lng}`;
    markerParam = `color:red%7Clabel:${encodeURIComponent(markerLabel)}%7C${location.lat},${location.lng}`;
  }

  return `https://maps.googleapis.com/maps/api/staticmap?center=${centerParam}&zoom=${zoom}&size=${size}&scale=${scale}&markers=${markerParam}&key=${apiKey}`;
}
