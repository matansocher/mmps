import { parseOutcomePrices } from './parse-outcome-prices';

describe('parseOutcomePrices', () => {
  describe('valid inputs', () => {
    it('should parse standard yes/no prices', () => {
      expect(parseOutcomePrices('["0.75", "0.25"]')).toEqual({
        yesPrice: 0.75,
        noPrice: 0.25,
      });
    });

    it('should parse prices that sum to 1', () => {
      expect(parseOutcomePrices('["0.50", "0.50"]')).toEqual({
        yesPrice: 0.5,
        noPrice: 0.5,
      });
    });

    it('should parse extreme yes price', () => {
      expect(parseOutcomePrices('["0.99", "0.01"]')).toEqual({
        yesPrice: 0.99,
        noPrice: 0.01,
      });
    });

    it('should parse extreme no price', () => {
      expect(parseOutcomePrices('["0.01", "0.99"]')).toEqual({
        yesPrice: 0.01,
        noPrice: 0.99,
      });
    });

    it('should parse prices with many decimal places', () => {
      expect(parseOutcomePrices('["0.123456", "0.876544"]')).toEqual({
        yesPrice: 0.123456,
        noPrice: 0.876544,
      });
    });

    it('should parse integer strings', () => {
      expect(parseOutcomePrices('["1", "0"]')).toEqual({
        yesPrice: 1,
        noPrice: 0,
      });
    });
  });

  describe('invalid inputs', () => {
    it('should return zeros for invalid JSON', () => {
      expect(parseOutcomePrices('invalid')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });

    it('should return zeros for empty string', () => {
      expect(parseOutcomePrices('')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });

    it('should return zeros for empty array', () => {
      expect(parseOutcomePrices('[]')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });

    it('should return zeros for malformed JSON', () => {
      expect(parseOutcomePrices('{"yes": 0.5}')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });

    it('should handle array with only one element', () => {
      const result = parseOutcomePrices('["0.75"]');
      expect(result.yesPrice).toBe(0.75);
      expect(result.noPrice).toBe(0);
    });

    it('should handle non-numeric strings in array', () => {
      expect(parseOutcomePrices('["abc", "def"]')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });

    it('should handle null values in array', () => {
      expect(parseOutcomePrices('[null, null]')).toEqual({
        yesPrice: 0,
        noPrice: 0,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle extra elements in array (only uses first two)', () => {
      expect(parseOutcomePrices('["0.5", "0.3", "0.2"]')).toEqual({
        yesPrice: 0.5,
        noPrice: 0.3,
      });
    });

    it('should handle whitespace in JSON string', () => {
      expect(parseOutcomePrices('[ "0.75" , "0.25" ]')).toEqual({
        yesPrice: 0.75,
        noPrice: 0.25,
      });
    });
  });
});
