import axios from 'axios';
import { SPOTIFY_API_BASE_URL } from '../constants';
import { SpotifyRemoveTracksResponse } from '../types';

export async function removeTracksFromPlaylist(playlistId: string, trackUris: string[], accessToken: string): Promise<SpotifyRemoveTracksResponse> {
  const response = await axios.delete(`${SPOTIFY_API_BASE_URL}/playlists/${playlistId}/tracks`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { tracks: trackUris.map((uri) => ({ uri })) },
  });

  return {
    playlistId,
    removed: trackUris.length,
    snapshotId: response.data.snapshot_id,
  };
}
