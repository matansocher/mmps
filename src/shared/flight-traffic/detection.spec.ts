import { evaluateTraffic, median } from './detection';

const history = (insideCount: number, outsideCount = 50, count = 7) => Array.from({ length: count }, () => ({ insideCount, outsideCount }));

describe('median()', () => {
  test.each([
    { values: [], expected: 0 },
    { values: [3, 1, 2], expected: 2 },
    { values: [4, 1, 3, 2], expected: 2.5 },
  ])('should return $expected for $values', ({ values, expected }) => {
    expect(median(values)).toEqual(expected);
  });
});

describe('evaluateTraffic()', () => {
  test.each([
    { name: 'warm-up with too few samples', inside: 0, isLowTraffic: false, samples: history(40, 50, 6), status: 'warming_up', transition: 'none' },
    { name: 'a quiet hour with a tiny baseline', inside: 0, isLowTraffic: false, samples: history(5), status: 'quiet_hour', transition: 'none' },
    { name: 'normal traffic', inside: 38, isLowTraffic: false, samples: history(40), status: 'normal', transition: 'none' },
    { name: 'a drop to 25% of the baseline', inside: 10, isLowTraffic: false, samples: history(40), status: 'low', transition: 'enter_low' },
    { name: 'no flights at all', inside: 0, isLowTraffic: false, samples: history(40), status: 'low', transition: 'enter_low' },
    { name: 'a partial drop above the threshold', inside: 11, isLowTraffic: false, samples: history(40), status: 'normal', transition: 'none' },
    { name: 'staying low', inside: 5, isLowTraffic: true, samples: history(40), status: 'low', transition: 'none' },
    { name: 'partial recovery below 50%', inside: 16, isLowTraffic: true, samples: history(40), status: 'low', transition: 'none' },
    { name: 'recovery at 50%', inside: 20, isLowTraffic: true, samples: history(40), status: 'normal', transition: 'recover' },
    { name: 'a quiet hour while low', inside: 0, isLowTraffic: true, samples: history(3), status: 'quiet_hour', transition: 'none' },
  ])('should detect $name', ({ inside, isLowTraffic, samples, status, transition }) => {
    const result = evaluateTraffic({ inside, outside: 50, history: samples, isLowTraffic });
    expect(result.status).toEqual(status);
    expect(result.transition).toEqual(transition);
  });

  it('should report baselines and ratios', () => {
    const result = evaluateTraffic({ inside: 10, outside: 25, history: history(40, 50), isLowTraffic: false });
    expect(result).toEqual({ status: 'low', transition: 'enter_low', baselineInside: 40, baselineOutside: 50, ratio: 0.25, neighbourRatio: 0.5 });
  });
});
