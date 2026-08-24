import { describe, expect, it } from 'vitest';
import { PS5_PLATFORM_ID } from '../constants';
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
    const result = resolveReleaseInfo([{ date: unix('2026-09-15'), human: 'Sep 15, 2026', platform: PS5_PLATFORM_ID, status: 0 }], NOW);
    expect(result.status).toEqual('upcoming');
    expect(result.human).toEqual('Sep 15, 2026');
    expect(result.date).toEqual(new Date(unix('2026-09-15') * 1000));
  });

  it('should return released for a past exact date', () => {
    const result = resolveReleaseInfo([{ date: unix('2025-01-10'), human: 'Jan 10, 2025', platform: PS5_PLATFORM_ID, status: 0 }], NOW);
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
        { date: unix('2026-12-03'), human: 'Dec 3, 2026', platform: PS5_PLATFORM_ID, status: 0 },
      ],
      NOW,
    );
    expect(result.human).toEqual('Dec 3, 2026');
  });
});
