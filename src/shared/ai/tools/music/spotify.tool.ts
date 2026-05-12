import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  addTracksToPlaylist,
  createPlaylist,
  deletePlaylist,
  getArtistTopTracks,
  getSpotifyAccessToken,
  getSpotifyUserAccessToken,
  getTrackInfo,
  getUserPlaylists,
  removeTracksFromPlaylist,
  searchArtists,
  searchPlaylists,
  searchTracks,
} from '@services/spotify';

const schema = z.object({
  action: z
    .enum([
      'search_track',
      'search_artist',
      'get_track_info',
      'search_playlist',
      'get_artist_top_tracks',
      'create_playlist',
      'add_tracks_to_playlist',
      'get_user_playlists',
      'delete_playlist',
      'remove_tracks_from_playlist',
    ])
    .describe(
      'The action to perform: search_track (search for songs), search_artist (search for artists), get_track_info (get detailed track information), search_playlist (search for public playlists), get_artist_top_tracks (get top tracks by artist), create_playlist (create a new playlist on the user account), add_tracks_to_playlist (add tracks to an existing playlist), get_user_playlists (list the user\'s playlists), delete_playlist (delete/unfollow a playlist from the user account), remove_tracks_from_playlist (remove tracks from an existing playlist)',
    ),
  query: z
    .string()
    .optional()
    .describe('Search query for track/artist/playlist search. For get_track_info, the track ID. For get_artist_top_tracks, the artist ID. Not required for create_playlist, add_tracks_to_playlist, or get_user_playlists.'),
  limit: z.number().int().min(1).max(50).default(5).describe('Number of results to return (1-50, default 5)'),
  market: z.string().length(2).default('IL').describe('Market/country code (ISO 3166-1 alpha-2, e.g., US, GB, DE)'),
  playlistName: z.string().optional().describe('Name of the playlist to create (required for create_playlist)'),
  playlistDescription: z.string().optional().default('').describe('Description of the playlist to create (optional)'),
  isPublic: z.boolean().optional().default(false).describe('Whether the new playlist should be public (default false)'),
  playlistId: z.string().optional().describe('Spotify playlist ID (required for add_tracks_to_playlist, remove_tracks_from_playlist, delete_playlist)'),
  trackUris: z.array(z.string()).optional().describe('Spotify track URIs, e.g., ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"] (required for add_tracks_to_playlist and remove_tracks_from_playlist)'),
});

async function runner({ action, query, limit, market, playlistName, playlistDescription, isPublic, playlistId, trackUris }: z.infer<typeof schema>): Promise<string> {
  try {
    let result;
    switch (action) {
      case 'search_track':
        if (!query) return JSON.stringify({ error: 'query is required for search_track' });
        result = await searchTracks(query, limit, market, await getSpotifyAccessToken());
        break;
      case 'search_artist':
        if (!query) return JSON.stringify({ error: 'query is required for search_artist' });
        result = await searchArtists(query, limit, market, await getSpotifyAccessToken());
        break;
      case 'get_track_info':
        if (!query) return JSON.stringify({ error: 'query (track ID) is required for get_track_info' });
        result = await getTrackInfo(query, market, await getSpotifyAccessToken());
        break;
      case 'search_playlist':
        if (!query) return JSON.stringify({ error: 'query is required for search_playlist' });
        result = await searchPlaylists(query, limit, market, await getSpotifyAccessToken());
        break;
      case 'get_artist_top_tracks':
        if (!query) return JSON.stringify({ error: 'query (artist ID) is required for get_artist_top_tracks' });
        result = await getArtistTopTracks(query, market, await getSpotifyAccessToken());
        break;
      case 'create_playlist':
        if (!playlistName) return JSON.stringify({ error: 'playlistName is required for create_playlist' });
        result = await createPlaylist(playlistName, playlistDescription ?? '', isPublic ?? false, await getSpotifyUserAccessToken());
        break;
      case 'add_tracks_to_playlist':
        if (!playlistId || !trackUris?.length) return JSON.stringify({ error: 'playlistId and trackUris are required for add_tracks_to_playlist' });
        result = await addTracksToPlaylist(playlistId, trackUris, await getSpotifyUserAccessToken());
        break;
      case 'get_user_playlists':
        result = await getUserPlaylists(limit, await getSpotifyUserAccessToken());
        break;
      case 'delete_playlist':
        if (!playlistId) return JSON.stringify({ error: 'playlistId is required for delete_playlist' });
        result = await deletePlaylist(playlistId, await getSpotifyUserAccessToken());
        break;
      case 'remove_tracks_from_playlist':
        if (!playlistId || !trackUris?.length) return JSON.stringify({ error: 'playlistId and trackUris are required for remove_tracks_from_playlist' });
        result = await removeTracksFromPlaylist(playlistId, trackUris, await getSpotifyUserAccessToken());
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
  description:
    'Search Spotify (tracks, artists, playlists), get track details and artist top tracks, and manage the user\'s own playlists (create playlist, add tracks to playlist, list user playlists). Requires Spotify API credentials and a user refresh token for playlist write actions.',
  schema,
});
