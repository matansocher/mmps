import type { SpotifyEpisode } from '@services/spotify';

export type PodcastEpisodeUpdate = {
  readonly showName: string;
  readonly episodes: SpotifyEpisode[];
};

export function formatPodcastUpdateMessage(updates: PodcastEpisodeUpdate[]): string {
  const header = `*New Podcast Episodes* 🎙️\n\n`;

  const showSections = updates.map(({ showName, episodes }) => {
    const episodeLines = episodes.map((episode) => `   • [${episode.name}](${episode.external_urls.spotify}) (${episode.release_date})`);
    return `*${showName}*\n${episodeLines.join('\n')}`;
  });

  return header + showSections.join('\n\n');
}
