import type { Placemark } from '../types';

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// KML colors are aabbggrr.
export function hexToKmlColor(hex: string): string {
  const clean = /^#?([0-9a-f]{6})$/i.exec(hex)?.[1] ?? 'ea4335';
  return `ff${clean.slice(4, 6)}${clean.slice(2, 4)}${clean.slice(0, 2)}`.toLowerCase();
}

export function placemarksToKml(placemarks: readonly Placemark[], documentName = 'My places'): string {
  const items = placemarks
    .map(
      (p) => `    <Placemark>
      <name>${escapeXml(p.name)}</name>
      <description>${escapeXml(p.description)}</description>
      <Style><IconStyle><color>${hexToKmlColor(p.color)}</color></IconStyle></Style>
      <Point><coordinates>${p.lon},${p.lat},${Math.round(p.height * 100) / 100}</coordinates></Point>
    </Placemark>`,
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(documentName)}</name>
${items}
  </Document>
</kml>
`;
}

export function placemarksToGeoJson(placemarks: readonly Placemark[]): string {
  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features: placemarks.map((p) => ({
        type: 'Feature',
        id: p.id,
        properties: { name: p.name, description: p.description, color: p.color, createdAt: p.createdAt },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat, Math.round(p.height * 100) / 100] },
      })),
    },
    null,
    2,
  );
}

export function downloadText(filename: string, content: string, mime: string): void {
  downloadBlob(filename, new Blob([content], { type: mime }));
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
