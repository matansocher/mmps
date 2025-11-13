import { Earthquake } from '@services/earthquake-api';
import { shouldNotifyAboutEarthquake } from './earthquake-filter.utils';

describe('Earthquake filtering logic', () => {
  describe('shouldNotifyAboutEarthquake()', () => {
    it('should return true for magnitude > 6 globally', () => {
      const earthquake: Earthquake = {
        type: 'Feature',
        id: 'test1',
        properties: {
          mag: 6.5,
          place: 'Far from Israel',
          time: Date.now(),
          updated: Date.now(),
          tz: null,
          url: 'https://example.com',
          detail: 'https://example.com',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 0,
          net: 'us',
          code: 'test',
          ids: 'test',
          sources: 'us',
          types: 'origin',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: 'mw',
          type: 'earthquake',
          title: 'Test',
        },
        geometry: {
          type: 'Point',
          coordinates: [0, 0, 10], // Far from Israel (Atlantic Ocean)
        },
      };

      expect(shouldNotifyAboutEarthquake(earthquake)).toBe(true);
    });

    it('should return true for any magnitude within 1000km of Jerusalem', () => {
      const earthquake: Earthquake = {
        type: 'Feature',
        id: 'test2',
        properties: {
          mag: 4.0,
          place: 'Near Israel',
          time: Date.now(),
          updated: Date.now(),
          tz: null,
          url: 'https://example.com',
          detail: 'https://example.com',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 0,
          net: 'us',
          code: 'test',
          ids: 'test',
          sources: 'us',
          types: 'origin',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: 'mw',
          type: 'earthquake',
          title: 'Test',
        },
        geometry: {
          type: 'Point',
          coordinates: [35.5, 32.0, 10], // Very close to Jerusalem
        },
      };

      expect(shouldNotifyAboutEarthquake(earthquake)).toBe(true);
    });

    it('should return false for magnitude <= 6 and far from Israel', () => {
      const earthquake: Earthquake = {
        type: 'Feature',
        id: 'test3',
        properties: {
          mag: 5.5,
          place: 'Far from Israel',
          time: Date.now(),
          updated: Date.now(),
          tz: null,
          url: 'https://example.com',
          detail: 'https://example.com',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 0,
          net: 'us',
          code: 'test',
          ids: 'test',
          sources: 'us',
          types: 'origin',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: 'mw',
          type: 'earthquake',
          title: 'Test',
        },
        geometry: {
          type: 'Point',
          coordinates: [-120, 40, 10], // California, USA - far from Israel
        },
      };

      expect(shouldNotifyAboutEarthquake(earthquake)).toBe(false);
    });

    it('should return true for magnitude exactly 6.1 globally', () => {
      const earthquake: Earthquake = {
        type: 'Feature',
        id: 'test4',
        properties: {
          mag: 6.1,
          place: 'Japan',
          time: Date.now(),
          updated: Date.now(),
          tz: null,
          url: 'https://example.com',
          detail: 'https://example.com',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 0,
          net: 'us',
          code: 'test',
          ids: 'test',
          sources: 'us',
          types: 'origin',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: 'mw',
          type: 'earthquake',
          title: 'Test',
        },
        geometry: {
          type: 'Point',
          coordinates: [139.6917, 35.6895, 10], // Tokyo
        },
      };

      expect(shouldNotifyAboutEarthquake(earthquake)).toBe(true);
    });

    it('should return true for earthquake in Egypt (within 1000km)', () => {
      const earthquake: Earthquake = {
        type: 'Feature',
        id: 'test5',
        properties: {
          mag: 4.5,
          place: 'Egypt',
          time: Date.now(),
          updated: Date.now(),
          tz: null,
          url: 'https://example.com',
          detail: 'https://example.com',
          felt: null,
          cdi: null,
          mmi: null,
          alert: null,
          status: 'reviewed',
          tsunami: 0,
          sig: 0,
          net: 'us',
          code: 'test',
          ids: 'test',
          sources: 'us',
          types: 'origin',
          nst: null,
          dmin: null,
          rms: 0,
          gap: null,
          magType: 'mw',
          type: 'earthquake',
          title: 'Test',
        },
        geometry: {
          type: 'Point',
          coordinates: [31.2357, 30.0444, 10], // Cairo
        },
      };

      expect(shouldNotifyAboutEarthquake(earthquake)).toBe(true);
    });
  });
});
