import { getSpecialNumber, numberToEmojiMap } from './get-special-number';

describe('getSpecialNumber()', () => {
  it('should replace the number with the special number - one digit', () => {
    const actualResult = getSpecialNumber(1);
    expect(actualResult).toEqual(numberToEmojiMap[1]);
  });

  it('should replace the number with the special number - two digits', () => {
    const actualResult = getSpecialNumber(23);
    expect(actualResult).toEqual(`${numberToEmojiMap[2]}${numberToEmojiMap[3]}`);
  });

  it('should replace the number with the special number - three digits', () => {
    const actualResult = getSpecialNumber(690);
    expect(actualResult).toEqual(`${numberToEmojiMap[6]}${numberToEmojiMap[9]}${numberToEmojiMap[0]}`);
  });
});
