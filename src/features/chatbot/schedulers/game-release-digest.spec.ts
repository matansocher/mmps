import { describe, expect, it } from 'vitest';
import type { GameFollow } from '@shared/game-releases';
import { buildDigestMessage } from './game-release-digest';

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

const NOW = new Date('2026-08-21T12:00:00Z');

describe('buildDigestMessage()', () => {
  it('should list a dated game with its countdown', () => {
    const message = buildDigestMessage([buildFollow({ name: 'Wolverine' })], NOW);
    expect(message).toContain('| Wolverine | Sep 15, 2026 · in 25 days |');
  });

  it('should render a markdown table header', () => {
    const message = buildDigestMessage([buildFollow()], NOW);
    expect(message).toContain('| Game | Release |');
    expect(message).toContain('|:-----|:--------|');
  });

  it('should sort dated games by release date ascending', () => {
    const message = buildDigestMessage(
      [
        buildFollow({ igdbId: 2, name: 'Later Game', releaseDate: new Date('2026-12-01T12:00:00Z'), releaseHuman: 'Dec 1, 2026' }),
        buildFollow({ igdbId: 1, name: 'Sooner Game', releaseDate: new Date('2026-09-01T12:00:00Z'), releaseHuman: 'Sep 1, 2026' }),
      ],
      NOW,
    );
    expect(message.indexOf('Sooner Game')).toBeLessThan(message.indexOf('Later Game'));
  });

  it('should sort undated games after dated ones', () => {
    const message = buildDigestMessage(
      [buildFollow({ igdbId: 2, name: 'Unknown Game', releaseDate: null, releaseHuman: 'TBA', releaseStatus: 'tba' }), buildFollow({ igdbId: 1, name: 'Dated Game' })],
      NOW,
    );
    expect(message.indexOf('Dated Game')).toBeLessThan(message.indexOf('Unknown Game'));
  });

  it('should render undated games without a countdown', () => {
    const message = buildDigestMessage([buildFollow({ name: 'Silksong', releaseDate: null, releaseHuman: 'Q4 2026', releaseStatus: 'upcoming' })], NOW);
    expect(message).toContain('| Silksong | Q4 2026 |');
  });

  it('should use release-day wording on the day itself', () => {
    const message = buildDigestMessage([buildFollow({ name: 'Today Game', releaseDate: new Date('2026-08-21T20:00:00Z'), releaseHuman: 'Aug 21, 2026' })], NOW);
    expect(message).toContain('releases today');
  });
});
