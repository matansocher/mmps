import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyPlaylist } from '../types';

export async function createPlaylist(name: string, description: string, isPublic: boolean, accessToken: string): Promise<SpotifyPlaylist> {
  const meResponse = await axios.get(`${SPOTIFY_API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userId = meResponse.data.id;

  const response = await axios.post(
    `${SPOTIFY_API_BASE_URL}/users/${userId}/playlists`,
    { name, description, public: isPublic },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
  );

  return response.data as SpotifyPlaylist;
}
