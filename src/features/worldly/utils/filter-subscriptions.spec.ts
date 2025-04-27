import { DEFAULT_DAILY_AMOUNT, INTERVAL_HOURS_BY_PRIORITY } from '../worldly.config';
import { filterSubscriptions } from './filter-subscriptions';

const mockUTCHour = (hour: number) => {
  jest.spyOn(global, 'Date').mockImplementation(
    () =>
      ({
        getUTCHours: () => hour,
      }) as unknown as Date,
  );
};

describe('filterSubscriptions()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false if currentHour is not in array and dailyAmount is set', () => {
    mockUTCHour(11);
    const actualResult = filterSubscriptions(2);
    expect(actualResult).toEqual(false);
  });

  it('should return false if currentHour is not in array and dailyAmount is not set', () => {
    mockUTCHour(11);
    const actualResult = filterSubscriptions(undefined);
    expect(actualResult).toEqual(false);
  });

  it('should return true if currentHour is below in the index array of dailyAmount', () => {
    mockUTCHour(12);
    const actualResult = filterSubscriptions(2);
    expect(actualResult).toEqual(true);
  });

  it('should return false if set to 0', () => {
    mockUTCHour(12);
    const actualResult = filterSubscriptions(0);
    expect(actualResult).toEqual(false);
  });

  it('should return false if currentHour is above in the index array of dailyAmount', () => {
    mockUTCHour(16);
    const actualResult = filterSubscriptions(2);
    expect(actualResult).toEqual(false);
  });

  it('should return true if currentHour is on the same index array of dailyAmount', () => {
    mockUTCHour(INTERVAL_HOURS_BY_PRIORITY[2 - 1]); // indexes
    const actualResult = filterSubscriptions(2);
    expect(actualResult).toEqual(true);
  });

  it('should return true if currentHour is below in the index array of dailyAmount as default', () => {
    mockUTCHour(INTERVAL_HOURS_BY_PRIORITY[DEFAULT_DAILY_AMOUNT - 1]);
    const actualResult = filterSubscriptions(DEFAULT_DAILY_AMOUNT);
    expect(actualResult).toEqual(true);
  });

  it('should return false if currentHour is above in the index array of dailyAmount as default', () => {
    mockUTCHour(INTERVAL_HOURS_BY_PRIORITY[DEFAULT_DAILY_AMOUNT + 1]);
    const actualResult = filterSubscriptions(DEFAULT_DAILY_AMOUNT);
    expect(actualResult).toEqual(false);
  });

  it('should return true if currentHour is on the same index array of dailyAmount as default', () => {
    mockUTCHour(INTERVAL_HOURS_BY_PRIORITY[DEFAULT_DAILY_AMOUNT - 1]); // indexes
    const actualResult = filterSubscriptions(DEFAULT_DAILY_AMOUNT);
    expect(actualResult).toEqual(true);
  });
});
