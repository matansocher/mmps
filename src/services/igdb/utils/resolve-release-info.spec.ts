import { describe, expect, it } from 'vitest';
import { FULL_DATE_CATEGORY_ID, PS5_PLATFORM_ID } from '../constants';
import { resolveReleaseInfo } from './resolve-release-info';

const NOW = new Date('2026-08-21T12:00:00Z');

// Noon UTC keeps the formatted day stable regardless of the runner's timezone.
const unix = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).getTime() / 1000;

describe('resolveReleaseInfo()', () => {
  it('should return TBA when there are no release dates', () => {
    expect(resolveReleaseInfo(undefined, NOW)).toEqual({ date: null, human: 'TBA', status: 'tba' });
    expect(resolveReleaseInfo([], NOW)).toEqual({ date: null, human: 'TBA', status: 'tba' });
  });

  it('should return upcoming for a future exact date', () => {
    const result = resolveReleaseInfo([{ date: unix('2026-09-15'), human: 'Sep 15, 2026', platform: PS5_PLATFORM_ID, category: FULL_DATE_CATEGORY_ID, status: 0 }], NOW);
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Sep 15, 2026');
    expect(result.date).toEqual(new Date(unix('2026-09-15') * 1000));
  });

  it('should return released for a past exact date', () => {
    const result = resolveReleaseInfo([{ date: unix('2025-01-10'), human: 'Jan 10, 2025', platform: PS5_PLATFORM_ID, category: FULL_DATE_CATEGORY_ID, status: 0 }], NOW);
    expect(result.status).toEqual('released');
  });

  it('should return TBA when the only entry is flagged as TBA', () => {
    expect(resolveReleaseInfo([{ platform: PS5_PLATFORM_ID, status: 2, human: 'TBD' }], NOW)).toEqual({ date: null, human: 'TBA', status: 'tba' });
  });

  it('should keep a fuzzy window as upcoming when there is no exact date', () => {
    expect(resolveReleaseInfo([{ platform: PS5_PLATFORM_ID, status: 0, human: 'Q4 2026', y: 2026, m: 0 }], NOW)).toEqual({ date: null, human: 'Q4 2026', status: 'upcoming' });
  });

  it('should fall back to the year when there is no human string', () => {
    expect(resolveReleaseInfo([{ platform: PS5_PLATFORM_ID, status: 0, y: 2027 }], NOW)).toEqual({ date: null, human: '2027', status: 'upcoming' });
  });

  it('should prefer the worldwide entry over an earlier regional one', () => {
    const result = resolveReleaseInfo(
      [
        { date: unix('2026-09-10'), human: 'Sep 10, 2026', platform: PS5_PLATFORM_ID, region: 5, status: 0 },
        { date: unix('2026-09-15'), human: 'Sep 15, 2026', platform: PS5_PLATFORM_ID, region: 8, status: 0 },
      ],
      NOW,
    );
    expect(result.human).toEqual('Sep 15, 2026');
  });

  it('should pick the earliest date when no worldwide entry exists', () => {
    const result = resolveReleaseInfo(
      [
        { date: unix('2026-11-01'), human: 'Nov 1, 2026', platform: PS5_PLATFORM_ID, region: 2, status: 0 },
        { date: unix('2026-09-15'), human: 'Sep 15, 2026', platform: PS5_PLATFORM_ID, region: 1, status: 0 },
      ],
      NOW,
    );
    expect(result.human).toEqual('Sep 15, 2026');
  });

  it('should ignore entries for other platforms', () => {
    const result = resolveReleaseInfo(
      [
        { date: unix('2024-01-01'), human: 'Jan 1, 2024', platform: 48, status: 0 },
        { date: unix('2026-09-15'), human: 'Sep 15, 2026', platform: PS5_PLATFORM_ID, status: 0 },
      ],
      NOW,
    );
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Sep 15, 2026');
  });

  it('should prefer an exact date over a fuzzy sibling entry', () => {
    const result = resolveReleaseInfo(
      [
        { platform: PS5_PLATFORM_ID, status: 0, human: 'Q4 2026', y: 2026 },
        { date: unix('2026-12-03'), human: 'Dec 3, 2026', platform: PS5_PLATFORM_ID, category: FULL_DATE_CATEGORY_ID, status: 0 },
      ],
      NOW,
    );
    expect(result.human).toEqual('Dec 3, 2026');
  });

  it('should not mark a month-precision release as released when its start-of-period timestamp has passed', () => {
    // IGDB gives an "October 2026" entry a timestamp at the start of the month, which has already
    // passed relative to NOW. It must stay upcoming and expose the human window, never "released".
    const result = resolveReleaseInfo([{ date: unix('2026-10-01'), human: 'Oct 2026', platform: PS5_PLATFORM_ID, category: 1, y: 2026, m: 10, status: 0 }], NOW);
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Oct 2026');
    expect(result.date).toBeNull();
  });

  it('should not mark a quarter-precision release as released when its start-of-period timestamp has passed', () => {
    const result = resolveReleaseInfo([{ date: unix('2026-01-01'), human: 'Q4 2026', platform: PS5_PLATFORM_ID, category: 6, y: 2026, status: 0 }], NOW);
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Q4 2026');
    expect(result.date).toBeNull();
  });

  it('should not mark a year-precision release as released when its start-of-year timestamp has passed', () => {
    const result = resolveReleaseInfo([{ date: unix('2026-01-01'), human: '2026', platform: PS5_PLATFORM_ID, category: 2, y: 2026, status: 0 }], NOW);
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('2026');
    expect(result.date).toBeNull();
  });

  it('should prefer an exact-day sibling over an imprecise dated entry', () => {
    const result = resolveReleaseInfo(
      [
        { date: unix('2026-10-01'), human: 'Oct 2026', platform: PS5_PLATFORM_ID, category: 1, status: 0 },
        { date: unix('2026-10-14'), human: 'Oct 14, 2026', platform: PS5_PLATFORM_ID, category: FULL_DATE_CATEGORY_ID, status: 0 },
      ],
      NOW,
    );
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Oct 14, 2026');
    expect(result.date).toEqual(new Date(unix('2026-10-14') * 1000));
  });
});
