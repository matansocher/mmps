import { describe, expect, it } from 'vitest';
import type { Placemark } from '../types';
import { hexToKmlColor, placemarksToGeoJson, placemarksToKml } from './export';

const placemark: Placemark = {
  id: 'p1',
  name: 'Tom & Jerry <home>',
  description: 'A "nice" place',
  lat: 32.08,
  lon: 34.78,
  height: 12.345,
  color: '#ea4335',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('hexToKmlColor()', () => {
  it('converts rrggbb to aabbggrr', () => {
    expect(hexToKmlColor('#ea4335')).toEqual('ff3543ea');
  });
});

describe('placemarksToKml()', () => {
  it('escapes text and writes lon,lat,height', () => {
    const kml = placemarksToKml([placemark]);
    expect(kml).toContain('<name>Tom &amp; Jerry &lt;home&gt;</name>');
    expect(kml).toContain('<description>A &quot;nice&quot; place</description>');
    expect(kml).toContain('<coordinates>34.78,32.08,12.35</coordinates>');
  });
});

describe('placemarksToGeoJson()', () => {
  it('produces a point feature collection', () => {
    const json = JSON.parse(placemarksToGeoJson([placemark]));
    expect(json.features[0].geometry).toEqual({ type: 'Point', coordinates: [34.78, 32.08, 12.35] });
    expect(json.features[0].properties.name).toEqual(placemark.name);
  });
});
