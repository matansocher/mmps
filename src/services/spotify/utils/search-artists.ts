import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyArtist, SpotifySearchArtistsResponse } from '../types';

export async function searchArtists(query: string, limit: number, market: string, accessToken: string): Promise<SpotifySearchArtistsResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
    params: { q: query, type: 'artist', limit, market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const artists = (response.data.artists.items as SpotifyArtist[]).filter(Boolean);

  return {
    query,
    artists,
    total: response.data.artists.total,
  };
}
