import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyPlaylist, SpotifyUserPlaylistsResponse } from '../types';

export async function getUserPlaylists(limit: number, accessToken: string): Promise<SpotifyUserPlaylistsResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/me/playlists`, {
    params: { limit },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const playlists = (response.data.items as SpotifyPlaylist[]).filter(Boolean);

  return {
    playlists,
    total: response.data.total,
  };
}
