import { computePoints } from './scoring';

describe('computePoints()', () => {
  test.each([
    { guess: { home: 2, away: 1 }, actual: { home: 2, away: 1 }, expected: 5 },
    { guess: { home: 0, away: 0 }, actual: { home: 0, away: 0 }, expected: 5 },
    { guess: { home: 3, away: 3 }, actual: { home: 3, away: 3 }, expected: 5 },
  ])('exact score ($guess.home-$guess.away vs $actual.home-$actual.away) → 5 pts', ({ guess, actual, expected }) => {
    expect(computePoints(guess, actual)).toEqual(expected);
  });

  test.each([
    { guess: { home: 2, away: 1 }, actual: { home: 3, away: 2 }, expected: 3 },
    { guess: { home: 1, away: 0 }, actual: { home: 4, away: 3 }, expected: 3 },
    { guess: { home: 1, away: 1 }, actual: { home: 2, away: 2 }, expected: 3 },
    { guess: { home: 0, away: 0 }, actual: { home: 1, away: 1 }, expected: 3 },
    { guess: { home: 0, away: 2 }, actual: { home: 1, away: 3 }, expected: 3 },
  ])('right result + right GD ($guess.home-$guess.away vs $actual.home-$actual.away) → 3 pts', ({ guess, actual, expected }) => {
    expect(computePoints(guess, actual)).toEqual(expected);
  });

  test.each([
    { guess: { home: 1, away: 0 }, actual: { home: 4, away: 2 }, expected: 1 },
    { guess: { home: 3, away: 0 }, actual: { home: 1, away: 0 }, expected: 1 },
    { guess: { home: 0, away: 1 }, actual: { home: 0, away: 3 }, expected: 1 },
  ])('right result only ($guess.home-$guess.away vs $actual.home-$actual.away) → 1 pt', ({ guess, actual, expected }) => {
    expect(computePoints(guess, actual)).toEqual(expected);
  });

  test.each([
    { guess: { home: 2, away: 1 }, actual: { home: 0, away: 1 }, expected: 0 },
    { guess: { home: 0, away: 0 }, actual: { home: 1, away: 0 }, expected: 0 },
    { guess: { home: 3, away: 1 }, actual: { home: 1, away: 3 }, expected: 0 },
    { guess: { home: 1, away: 2 }, actual: { home: 2, away: 1 }, expected: 0 },
  ])('wrong result ($guess.home-$guess.away vs $actual.home-$actual.away) → 0 pts', ({ guess, actual, expected }) => {
    expect(computePoints(guess, actual)).toEqual(expected);
  });
});
