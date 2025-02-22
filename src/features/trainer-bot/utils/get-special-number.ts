export const numberToEmojiMap = {
  0: '0⃣',
  1: '1⃣',
  2: '2⃣',
  3: '3⃣',
  4: '4⃣',
  5: '5⃣',
  6: '6⃣',
  7: '7⃣',
  8: '8⃣',
  9: '9⃣',
};

export function getSpecialNumber(num: number): string {
  if (Number.isNaN(num)) {
    return num.toString();
  }
  return num
    .toString()
    .split('')
    .map((strNum) => numberToEmojiMap[strNum])
    .join('');
}
