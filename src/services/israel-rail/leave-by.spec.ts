import { getLeaveByTime } from './leave-by';

describe('getLeaveByTime()', () => {
  test.each([
    { departureTime: '08:30', walkingMinutes: 12, bufferMinutes: undefined, expected: '08:13' },
    { departureTime: '08:30', walkingMinutes: 12, bufferMinutes: 0, expected: '08:18' },
    { departureTime: '09:05', walkingMinutes: 1, bufferMinutes: 5, expected: '08:59' },
    { departureTime: '00:10', walkingMinutes: 20, bufferMinutes: 5, expected: '23:45' },
  ])('should return $expected for $departureTime after a $walkingMinutes min walk', ({ departureTime, walkingMinutes, bufferMinutes, expected }) => {
    expect(getLeaveByTime(departureTime, walkingMinutes, bufferMinutes)).toEqual(expected);
  });
});
