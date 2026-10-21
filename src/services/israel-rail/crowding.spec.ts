import { getCrowdingLevel, getTravelCrowding, getTravelLoadPercent } from './crowding';
import type { TrainLeg, TrainTravel } from './types';

function buildTravel(loads: readonly (number | undefined)[]): TrainTravel {
  return { legs: loads.map((predictedLoadPercent) => ({ predictedLoadPercent }) as TrainLeg) } as TrainTravel;
}

describe('getCrowdingLevel()', () => {
  test.each([
    { load: undefined, expected: undefined },
    { load: 0, expected: 'quiet' },
    { load: 39, expected: 'quiet' },
    { load: 40, expected: 'moderate' },
    { load: 69, expected: 'moderate' },
    { load: 70, expected: 'busy' },
    { load: 94, expected: 'busy' },
  ])('should return $expected for $load%', ({ load, expected }) => {
    expect(getCrowdingLevel(load)).toEqual(expected);
  });
});

describe('getTravelLoadPercent() / getTravelCrowding()', () => {
  test.each([
    { loads: [25], percent: 25, level: 'quiet' },
    { loads: [10, 75], percent: 75, level: 'busy' },
    { loads: [undefined, 45], percent: 45, level: 'moderate' },
    { loads: [undefined], percent: undefined, level: undefined },
  ])('should use the busiest leg for $loads', ({ loads, percent, level }) => {
    expect(getTravelLoadPercent(buildTravel(loads))).toEqual(percent);
    expect(getTravelCrowding(buildTravel(loads))).toEqual(level);
  });
});
