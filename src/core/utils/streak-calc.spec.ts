import { subDays } from 'date-fns';
import { ObjectId } from 'mongodb';
import { GameLog } from '@core/mongo/worldly-mongo';
import { getStreak, getStreakOfCorrectAnswers } from './streak-calc';

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

describe('getStreakOfCorrectAnswers()', () => {
  const baseGameLog: GameLog = {
    _id: new ObjectId(),
    chatId: 123456789,
    gameId: 'jd73c',
    type: 'map',
    createdAt: new Date(),
    selected: null,
    correct: null,
  };
  it('should return 0 streaks for an empty list', () => {
    expect(getStreakOfCorrectAnswers([])).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('should return 0 streaks when all entries are incorrect', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'USA', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it('should return correct streaks when all entries are correct and selected', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it('should reset tempStreak on incorrect or unselected entries', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it('should handle mixed correct/incorrect and selected/unselected entries', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'USA', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 1, longestStreak: 2 });
  });

  it('should return current streak only from the end', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it('should break current streak on first failure from the end', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it('should return longest streak even when current streak is 0', () => {
    const entries: GameLog[] = [
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'Canada' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
      { ...baseGameLog, selected: 'Canada', correct: 'USA' },
    ];
    expect(getStreakOfCorrectAnswers(entries)).toEqual({ currentStreak: 0, longestStreak: 2 });
  });
});
