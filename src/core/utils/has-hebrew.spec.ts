import { hasHebrew } from './has-hebrew';

describe('hasHebrew()', () => {
  it('should return false for empty string', () => {
    const actualResult = hasHebrew('');
    expect(actualResult).toEqual(false);
  });

  it('should return false for english string', () => {
    const actualResult = hasHebrew('body');
    expect(actualResult).toEqual(false);
  });

  it('should return true if text is in hebrew', () => {
    const actualResult = hasHebrew('שלום');
    expect(actualResult).toEqual(true);
  });

  it('should return true if text includes hebrew', () => {
    const actualResult = hasHebrew('שלום hello');
    expect(actualResult).toEqual(true);
  });
});
