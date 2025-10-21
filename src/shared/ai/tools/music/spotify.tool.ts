import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getArtistTopTracks, getSpotifyAccessToken, getTrackInfo, searchArtists, searchPlaylists, searchTracks } from '@services/spotify';

const schema = z.object({
  action: z
    .enum(['search_track', 'search_artist', 'get_track_info', 'search_playlist', 'get_artist_top_tracks'])
    .describe(
      'The action to perform: search_track (search for songs), search_artist (search for artists), get_track_info (get detailed track information), search_playlist (search for public playlists), get_artist_top_tracks (get top tracks by artist)',
    ),
  query: z.string().min(1).describe('Search query for track, artist, or playlist search. For get_track_info, provide the track ID. For get_artist_top_tracks, provide the artist ID.'),
  limit: z.number().int().min(1).max(20).default(5).describe('Number of results to return (1-20, default 5)'),
  market: z.string().length(2).default('IL').describe('Market/country code (ISO 3166-1 alpha-2, e.g., US, GB, DE)'),
});

async function runner({ action, query, limit, market }: z.infer<typeof schema>): Promise<string> {
  try {
    const accessToken = await getSpotifyAccessToken();

    let result;
    switch (action) {
      case 'search_track':
        result = await searchTracks(query, limit, market, accessToken);
        break;
      case 'search_artist':
        result = await searchArtists(query, limit, market, accessToken);
        break;
      case 'get_track_info':
        result = await getTrackInfo(query, market, accessToken);
        break;
      case 'search_playlist':
        result = await searchPlaylists(query, limit, market, accessToken);
        break;
      case 'get_artist_top_tracks':
        result = await getArtistTopTracks(query, market, accessToken);
        break;
      default:
        return JSON.stringify({ error: 'Invalid action specified' });
    }

    return JSON.stringify(result, null, 2);
  } catch (error) {
    if (error instanceof Error) {
      return JSON.stringify({ error: error.message });
    }
    return JSON.stringify({ error: 'An unknown error occurred while accessing Spotify' });
  }
}

export const spotifyTool = tool(runner, {
  name: 'spotify',
  description: 'Search for music on Spotify including tracks, artists, playlists, get detailed track information, and find top tracks by artists. Requires Spotify API credentials.',
  schema,
});
