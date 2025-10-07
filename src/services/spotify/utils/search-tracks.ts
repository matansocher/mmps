import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifySearchTracksResponse, SpotifyTrack } from '../types';

export async function searchTracks(query: string, limit: number, market: string, accessToken: string): Promise<SpotifySearchTracksResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
    params: { q: query, type: 'track', limit, market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const tracks = (response.data.tracks.items as SpotifyTrack[]).filter(Boolean);

  return {
    query,
    tracks,
    total: response.data.tracks.total,
  };
}
