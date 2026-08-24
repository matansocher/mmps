import { describe, expect, it } from 'vitest';
import { getAutoRefreshState } from './format';

describe('getAutoRefreshState()', () => {
  const previousToday = '2026-08-11';
  const currentToday = '2026-08-12';

  it('should follow the new day when the previous day was selected as today', () => {
    expect(getAutoRefreshState(previousToday, previousToday, currentToday, false)).toEqual({
      selectedDate: currentToday,
      shouldRefresh: false,
    });
  });

  it('should preserve a user-selected date across midnight', () => {
    expect(getAutoRefreshState('2026-08-15', previousToday, currentToday, false)).toEqual({
      selectedDate: '2026-08-15',
      shouldRefresh: false,
    });
  });

  it('should continue refreshing a selected date with live matches', () => {
    expect(getAutoRefreshState('2026-08-15', previousToday, currentToday, true)).toEqual({
      selectedDate: '2026-08-15',
      shouldRefresh: true,
    });
  });

  it('should refresh a selected date that becomes today', () => {
    expect(getAutoRefreshState(currentToday, previousToday, currentToday, false)).toEqual({
      selectedDate: currentToday,
      shouldRefresh: true,
    });
  });
});
