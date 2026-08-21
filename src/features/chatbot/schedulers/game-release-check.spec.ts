import { describe, expect, it } from 'vitest';
import type { GameReleaseInfo } from '@services/igdb';
import type { GameFollow } from '@shared/game-releases';
import { detectReleaseChange } from './game-release-check';

function buildFollow(overrides: Partial<GameFollow> = {}): GameFollow {
  return {
    chatId: 1,
    igdbId: 100,
    name: 'Some Game',
    slug: 'some-game',
    coverUrl: null,
    releaseDate: new Date('2026-09-15T12:00:00Z'),
    releaseHuman: 'Sep 15, 2026',
    releaseStatus: 'upcoming',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const upcoming = (isoDate: string, human: string): GameReleaseInfo => ({ date: new Date(`${isoDate}T12:00:00Z`), human, status: 'upcoming' });

describe('detectReleaseChange()', () => {
  it('should return none when the date is unchanged', () => {
    expect(detectReleaseChange(buildFollow(), upcoming('2026-09-15', 'Sep 15, 2026'))).toEqual('none');
  });

  it('should return released when the game has come out', () => {
    expect(detectReleaseChange(buildFollow(), { date: new Date('2026-09-15T12:00:00Z'), human: 'Sep 15, 2026', status: 'released' })).toEqual('released');
  });

  it('should return delayed when the date moves later', () => {
    expect(detectReleaseChange(buildFollow(), upcoming('2026-11-20', 'Nov 20, 2026'))).toEqual('delayed');
  });

  it('should return moved-up when the date moves earlier', () => {
    expect(detectReleaseChange(buildFollow(), upcoming('2026-08-30', 'Aug 30, 2026'))).toEqual('moved-up');
  });

  it('should return announced when a TBA game finally gets a date', () => {
    const follow = buildFollow({ releaseDate: null, releaseHuman: 'TBA', releaseStatus: 'tba' });
    expect(detectReleaseChange(follow, upcoming('2027-03-01', 'Mar 1, 2027'))).toEqual('announced');
  });

  it('should return announced when a fuzzy window resolves to an exact date', () => {
    const follow = buildFollow({ releaseDate: null, releaseHuman: 'Q4 2026', releaseStatus: 'upcoming' });
    expect(detectReleaseChange(follow, upcoming('2026-11-12', 'Nov 12, 2026'))).toEqual('announced');
  });

  it('should return changed when a fuzzy window shifts', () => {
    const follow = buildFollow({ releaseDate: null, releaseHuman: 'Q3 2026', releaseStatus: 'upcoming' });
    expect(detectReleaseChange(follow, { date: null, human: 'Q4 2026', status: 'upcoming' })).toEqual('changed');
  });

  it('should return none when a fuzzy window is unchanged', () => {
    const follow = buildFollow({ releaseDate: null, releaseHuman: 'Q4 2026', releaseStatus: 'upcoming' });
    expect(detectReleaseChange(follow, { date: null, human: 'Q4 2026', status: 'upcoming' })).toEqual('none');
  });

  it('should return changed when a dated game reverts to TBA', () => {
    expect(detectReleaseChange(buildFollow(), { date: null, human: 'TBA', status: 'tba' })).toEqual('changed');
  });

  it('should not re-announce a game that was already marked released', () => {
    const follow = buildFollow({ releaseStatus: 'released' });
    expect(detectReleaseChange(follow, { date: new Date('2026-09-15T12:00:00Z'), human: 'Sep 15, 2026', status: 'released' })).toEqual('none');
  });
});
