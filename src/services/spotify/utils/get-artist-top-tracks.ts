import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyArtistTopTracksResponse, SpotifyTrack } from '../types';

export async function getArtistTopTracks(artistId: string, market: string, accessToken: string): Promise<SpotifyArtistTopTracksResponse> {
  const response = await axios.get(`${SPOTIFY_API_BASE_URL}/artists/${artistId}/top-tracks`, {
    params: { market },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const tracks = (response.data.tracks as SpotifyTrack[]).filter(Boolean);

  return {
    artistId,
    tracks,
  };
}
