import { getSpotifyAccessToken, searchShows } from '@services/spotify';

const MARKET = 'IL';

export async function handleSearch(query: string): Promise<string> {
  if (!query) {
    return JSON.stringify({ success: false, error: 'query is required for search action' });
  }

  try {
    const { shows } = await searchShows(query, 5, MARKET, await getSpotifyAccessToken());

    if (shows.length === 0) {
      return JSON.stringify({ success: true, message: `No podcasts found for "${query}"`, shows: [] });
    }

    const showsList = shows.map((show) => ({
      showId: show.id,
      name: show.name,
      publisher: show.publisher,
      totalEpisodes: show.total_episodes,
      url: show.external_urls.spotify,
    }));

    return JSON.stringify({
      success: true,
      message: `Found ${shows.length} podcast(s) for "${query}". Use the showId to subscribe.`,
      shows: showsList,
    });
  } catch (err) {
    return JSON.stringify({ success: false, error: `Failed to search: ${err.message}` });
  }
}
