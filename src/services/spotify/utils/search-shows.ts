import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifySearchShowsResponse, SpotifyShow } from '../types';

export async function searchShows(query: string, limit: number, market: string, accessToken: string): Promise<SpotifySearchShowsResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/search`, {
    params: { q: query, type: 'show', limit, market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const shows = (response.data.shows.items as SpotifyShow[]).filter(Boolean);

  return {
    query,
    shows,
    total: response.data.shows.total,
  };
}
