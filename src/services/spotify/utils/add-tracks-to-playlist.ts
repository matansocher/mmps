import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyAddTracksResponse } from '../types';

export async function addTracksToPlaylist(playlistId: string, trackUris: string[], accessToken: string): Promise<SpotifyAddTracksResponse> {
  const response = await axios.post(
    `${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`,
    { uris: trackUris },
    { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
  );

  return {
    playlistId,
    added: trackUris.length,
    snapshotId: response.data.snapshot_id,
  };
}
