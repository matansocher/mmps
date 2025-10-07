import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyPlaylist, SpotifySearchPlaylistsResponse } from '../types';

export async function searchPlaylists(query: string, limit: number, market: string, accessToken: string): Promise<SpotifySearchPlaylistsResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
    params: { q: query, type: 'playlist', limit, market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const playlists = (response.data.playlists.items as SpotifyPlaylist[]).filter(Boolean);

  return {
    query,
    playlists,
    total: response.data.playlists.total,
  };
}
