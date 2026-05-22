import { getMatchdayKey } from './matchday';

describe('getMatchdayKey()', () => {
  it('returns the same day key for a time after noon Asia/Jerusalem', () => {
    // 2026-06-15 14:00 Asia/Jerusalem → UTC 11:00
    const date = new Date('2026-06-15T11:00:00Z');
    expect(getMatchdayKey(date)).toEqual('2026-06-15');
  });

  it('returns the previous day key for a time before noon Asia/Jerusalem', () => {
    // 2026-06-15 11:59 Asia/Jerusalem → UTC 08:59
    const date = new Date('2026-06-15T08:59:00Z');
    expect(getMatchdayKey(date)).toEqual('2026-06-14');
  });

  it('returns previous day for 03:00 Asia/Jerusalem (early morning match)', () => {
    // 2026-06-15 03:00 Asia/Jerusalem → UTC 00:00
    const date = new Date('2026-06-15T00:00:00Z');
    expect(getMatchdayKey(date)).toEqual('2026-06-14');
  });

  it('returns the same day for 23:59 Asia/Jerusalem', () => {
    // 2026-06-15 23:59 Asia/Jerusalem → UTC 20:59
    const date = new Date('2026-06-15T20:59:00Z');
    expect(getMatchdayKey(date)).toEqual('2026-06-15');
  });

  it('returns the same day for exactly noon Asia/Jerusalem', () => {
    // 2026-06-15 12:00 Asia/Jerusalem → UTC 09:00
    const date = new Date('2026-06-15T09:00:00Z');
    expect(getMatchdayKey(date)).toEqual('2026-06-15');
  });
});
