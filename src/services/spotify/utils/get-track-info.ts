import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyTrack } from '../types';

export async function getTrackInfo(trackId: string, market: string, accessToken: string): Promise<SpotifyTrack> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/tracks/${trackId}`, {
    params: { market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return response.data as SpotifyTrack;
}
