import { formatChange, formatPercent, generateOddsImage } from './odds-image';

describe('formatPercent()', () => {
  test.each([
    { probability: 0.725, expected: '73%' },
    { probability: 0.052, expected: '5.2%' },
    { probability: 0.004, expected: '<1%' },
    { probability: 0.996, expected: '>99%' },
    { probability: 0, expected: '0.0%' },
    { probability: 1, expected: '100%' },
  ])('should return $expected for $probability', ({ probability, expected }) => {
    expect(formatPercent(probability)).toEqual(expected);
  });
});

describe('formatChange()', () => {
  test.each([
    { change: 0.021, expected: '+2.1' },
    { change: -0.05, expected: '-5.0' },
    { change: 0.0001, expected: '0.0' },
  ])('should return $expected for $change', ({ change, expected }) => {
    expect(formatChange(change)).toEqual(expected);
  });
});

describe('generateOddsImage()', () => {
  test('should throw when there are no outcomes', () => {
    expect(() => generateOddsImage([{ title: 'x', rows: [] }])).toThrow();
  });
});
