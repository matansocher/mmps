import { extractSlugFromUrl } from './extract-slug-from-url';

describe('extractSlugFromUrl', () => {
  describe('event URLs', () => {
    it('should extract slug from full event URL', () => {
      expect(extractSlugFromUrl('https://polymarket.com/event/fed-decision-january')).toBe('fed-decision-january');
    });

    it('should extract slug from event URL with query params', () => {
      expect(extractSlugFromUrl('https://polymarket.com/event/fed-decision-january?ref=123')).toBe('fed-decision-january');
    });

    it('should extract slug from event URL without protocol', () => {
      expect(extractSlugFromUrl('polymarket.com/event/trump-wins-2024')).toBe('trump-wins-2024');
    });

    it('should extract slug from event URL with trailing slash', () => {
      expect(extractSlugFromUrl('https://polymarket.com/event/bitcoin-100k/')).toBe('bitcoin-100k');
    });

    it('should extract slug from event URL with www prefix', () => {
      expect(extractSlugFromUrl('https://www.polymarket.com/event/some-market')).toBe('some-market');
    });
  });

  describe('market URLs', () => {
    it('should extract slug from full market URL', () => {
      expect(extractSlugFromUrl('https://polymarket.com/market/will-trump-win')).toBe('will-trump-win');
    });

    it('should extract slug from market URL with query params', () => {
      expect(extractSlugFromUrl('https://polymarket.com/market/some-market?foo=bar')).toBe('some-market');
    });

    it('should extract slug from market URL without protocol', () => {
      expect(extractSlugFromUrl('polymarket.com/market/another-market')).toBe('another-market');
    });
  });

  describe('plain slugs', () => {
    it('should return slug as-is when no URL', () => {
      expect(extractSlugFromUrl('fed-decision-january')).toBe('fed-decision-january');
    });

    it('should trim whitespace from slug', () => {
      expect(extractSlugFromUrl('  spaced-slug  ')).toBe('spaced-slug');
    });

    it('should handle single word slugs', () => {
      expect(extractSlugFromUrl('bitcoin')).toBe('bitcoin');
    });

    it('should handle slugs with numbers', () => {
      expect(extractSlugFromUrl('trump-2024-election')).toBe('trump-2024-election');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(extractSlugFromUrl('')).toBe('');
    });

    it('should handle whitespace only', () => {
      expect(extractSlugFromUrl('   ')).toBe('');
    });

    it('should handle URL with multiple path segments after slug', () => {
      expect(extractSlugFromUrl('https://polymarket.com/event/my-market/extra/path')).toBe('my-market');
    });
  });
});
