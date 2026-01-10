import { getStaticMapUrl } from './get-static-map-url';

describe('getStaticMapUrl', () => {
  const mockApiKey = 'test-api-key-123';

  describe('with string location (place name)', () => {
    it('should generate URL with default options', () => {
      const result = getStaticMapUrl('Tel Aviv, Israel', mockApiKey);

      expect(result).toContain('https://maps.googleapis.com/maps/api/staticmap');
      expect(result).toContain('center=Tel%20Aviv%2C%20Israel');
      expect(result).toContain('zoom=16');
      expect(result).toContain('size=640x640');
      expect(result).toContain('scale=1');
      expect(result).toContain(`key=${mockApiKey}`);
      expect(result).toContain('markers=');
    });

    it('should encode special characters in place name', () => {
      const result = getStaticMapUrl('New York, NY, USA', mockApiKey);

      expect(result).toContain('center=New%20York%2C%20NY%2C%20USA');
    });

    it('should include marker with label A by default', () => {
      const result = getStaticMapUrl('Paris', mockApiKey);

      expect(result).toContain('label:A');
    });

    it('should use custom marker label', () => {
      const result = getStaticMapUrl('London', mockApiKey, { label: 'B' });

      expect(result).toContain('label:B');
    });

    it('should include red color marker', () => {
      const result = getStaticMapUrl('Berlin', mockApiKey);

      expect(result).toContain('color:red');
    });
  });

  describe('with coordinate location', () => {
    it('should generate URL with lat/lng coordinates', () => {
      const location = { lat: 32.0853, lng: 34.7818 };
      const result = getStaticMapUrl(location, mockApiKey);

      expect(result).toContain('center=32.0853,34.7818');
      expect(result).toContain('markers=color:red%7Clabel:A%7C32.0853,34.7818');
    });

    it('should handle negative coordinates', () => {
      const location = { lat: -33.8688, lng: 151.2093 };
      const result = getStaticMapUrl(location, mockApiKey);

      expect(result).toContain('center=-33.8688,151.2093');
    });

    it('should use custom label with coordinates', () => {
      const location = { lat: 40.7128, lng: -74.006 };
      const result = getStaticMapUrl(location, mockApiKey, { label: 'X' });

      expect(result).toContain('label:X');
    });
  });

  describe('with custom options', () => {
    it('should use custom size', () => {
      const result = getStaticMapUrl('Tokyo', mockApiKey, { size: '800x600' });

      expect(result).toContain('size=800x600');
    });

    it('should use custom zoom level', () => {
      const result = getStaticMapUrl('Sydney', mockApiKey, { zoom: 12 });

      expect(result).toContain('zoom=12');
    });

    it('should handle zoom level 0', () => {
      const result = getStaticMapUrl('World', mockApiKey, { zoom: 0 });

      expect(result).toContain('zoom=0');
    });

    it('should use custom scale', () => {
      const result = getStaticMapUrl('Dubai', mockApiKey, { scale: 2 });

      expect(result).toContain('scale=2');
    });

    it('should combine multiple custom options', () => {
      const result = getStaticMapUrl('Rome', mockApiKey, {
        size: '1024x768',
        zoom: 14,
        scale: 2,
        label: 'R',
      });

      expect(result).toContain('size=1024x768');
      expect(result).toContain('zoom=14');
      expect(result).toContain('scale=2');
      expect(result).toContain('label:R');
    });
  });

  describe('URL structure', () => {
    it('should have all required URL parameters', () => {
      const result = getStaticMapUrl('Jerusalem', mockApiKey);

      expect(result).toMatch(/center=/);
      expect(result).toMatch(/zoom=/);
      expect(result).toMatch(/size=/);
      expect(result).toMatch(/scale=/);
      expect(result).toMatch(/markers=/);
      expect(result).toMatch(/key=/);
    });

    it('should start with Google Maps API base URL', () => {
      const result = getStaticMapUrl('Cairo', mockApiKey);

      expect(result.startsWith('https://maps.googleapis.com/maps/api/staticmap?')).toBe(true);
    });
  });
});
