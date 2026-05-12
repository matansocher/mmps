import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyDeletePlaylistResponse } from '../types';

export async function deletePlaylist(playlistId: string, accessToken: string): Promise<SpotifyDeletePlaylistResponse> {
  await axios.delete(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/followers`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return { playlistId, deleted: true };
}
