import { describe, expect, it } from 'vitest';
import type { SpotifyEpisode } from '@services/spotify';
import { formatPodcastUpdateMessage } from './format-podcast-update';
import type { PodcastEpisodeUpdate } from './format-podcast-update';

function makeEpisode(overrides: Partial<SpotifyEpisode> = {}): SpotifyEpisode {
  return {
    id: 'ep1',
    name: 'Episode One',
    description: '',
    release_date: '2026-07-02',
    duration_ms: 1000,
    external_urls: { spotify: 'https://open.spotify.com/episode/ep1' },
    ...overrides,
  };
}

describe('formatPodcastUpdateMessage()', () => {
  it('should include the header, show name and a link per episode', () => {
    const updates: PodcastEpisodeUpdate[] = [{ showName: 'My Podcast', episodes: [makeEpisode()] }];

    const message = formatPodcastUpdateMessage(updates);

    expect(message).toContain('New Podcast Episodes');
    expect(message).toContain('*My Podcast*');
    expect(message).toContain('[Episode One](https://open.spotify.com/episode/ep1) (2026-07-02)');
  });

  it('should render multiple episodes for the same show', () => {
    const updates: PodcastEpisodeUpdate[] = [
      {
        showName: 'My Podcast',
        episodes: [makeEpisode({ id: 'ep2', name: 'Episode Two' }), makeEpisode({ id: 'ep1', name: 'Episode One' })],
      },
    ];

    const message = formatPodcastUpdateMessage(updates);

    expect(message).toContain('Episode Two');
    expect(message).toContain('Episode One');
  });
});
