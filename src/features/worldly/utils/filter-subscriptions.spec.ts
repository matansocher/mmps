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

  it('should return true if no dailyAmount', () => {
    const actualResult = filterSubscriptions(null);
    expect(actualResult).toEqual(true);
  });

  it('should return false if currentHour is not in array', () => {
    mockUTCHour(11);
    const actualResult = filterSubscriptions(3);
    expect(actualResult).toEqual(false);
  });

  it('should return true if currentHour is in array', () => {
    mockUTCHour(12);
    const actualResult = filterSubscriptions(3);
    expect(actualResult).toEqual(true);
  });

  it('should return false if currentHour is in array', () => {
    mockUTCHour(16);
    const actualResult = filterSubscriptions(3);
    expect(actualResult).toEqual(false);
  });
});
