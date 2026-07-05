import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyShow } from '../types';

export async function getShow(showId: string, market: string, accessToken: string): Promise<SpotifyShow> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/shows/${showId}`, {
    params: { market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data as SpotifyShow;
}
