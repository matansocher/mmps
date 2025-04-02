import { subDays } from 'date-fns';
import { getLongestStreak, getStreak } from './streak-calc';

const getDateAgo = (daysAgo: number): Date => {
  const today = new Date();
  return subDays(today, daysAgo);
};

describe('getStreak()', () => {
  it('should return 0 for empty array', () => {
    const actualResult = getStreak([]);
    expect(actualResult).toEqual(0);
  });

  it('should return 0 for no exercises today or yesterday', () => {
    const dates = [getDateAgo(3)];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(0);
  });

  it('should return 1 for a single exercise today', () => {
    const dates = [new Date()];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(1);
  });

  it('should return 1 for a single exercise yesterday', () => {
    const dates = [getDateAgo(1)];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(1);
  });

  it('should return 2 for a double exercises today and yesterday', () => {
    const dates = [getDateAgo(0), getDateAgo(1)];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(2);
  });

  it('should return 2 for a double exercises yesterday and the day before', () => {
    const dates = [getDateAgo(1), getDateAgo(2)];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(2);
  });

  it('should return 3 for a triple exercises', () => {
    const dates = [getDateAgo(1), getDateAgo(2), getDateAgo(3)];
    const actualResult = getStreak(dates);
    expect(actualResult).toEqual(3);
  });
});

describe('getLongestStreak()', () => {
  it('should return 0 for empty array', () => {
    const actualResult = getLongestStreak([]);
    expect(actualResult).toEqual(0);
  });

  it('should return 3 for a current 3 streak', () => {
    const dates = [getDateAgo(1), getDateAgo(2), getDateAgo(3), getDateAgo(5), getDateAgo(6)];
    const actualResult = getLongestStreak(dates);
    expect(actualResult).toEqual(3);
  });

  it('should return 3 for a past 3 streak', () => {
    const dates = [getDateAgo(1), getDateAgo(2), getDateAgo(4), getDateAgo(5), getDateAgo(6)];
    const actualResult = getLongestStreak(dates);
    expect(actualResult).toEqual(3);
  });
});
