import { LOCATIONS } from '../tracker.config';
import { findLocation } from './find-location';

describe('findLocation', () => {
  it('should return the correct location when chatId matches', () => {
    const result = findLocation(1332013273);
    expect(result).toEqual(LOCATIONS.toodie);
  });

  it('should return the correct location when chatId matches work location', () => {
    const result = findLocation(862305226);
    expect(result).toEqual(LOCATIONS.work);
  });

  it('should return null when chatId does not match any location', () => {
    const result = findLocation(999999999);
    expect(result).toBeNull();
  });

  it('should return null when chatId is null', () => {
    const result = findLocation(null as any);
    expect(result).toBeNull();
  });

  it('should handle zero chatId', () => {
    const result = findLocation(0);
    expect(result).toBeNull();
  });
});
