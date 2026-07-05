import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyEpisode, SpotifyShowEpisodesResponse } from '../types';

export async function getShowEpisodes(showId: string, limit: number, market: string, accessToken: string): Promise<SpotifyShowEpisodesResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/shows/${showId}/episodes`, {
    params: { limit, market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const episodes = (response.data.items as SpotifyEpisode[]).filter(Boolean);

  return {
    showId,
    episodes,
    total: response.data.total,
  };
}
