// Uses Apple's free public iTunes Lookup API (no API key, no cost, ~20 req/min).
// Supported links:
//   https://music.apple.com/us/album/better-together/1440857781?i=1440857786
//   https://music.apple.com/us/song/better-together/1440857786
import type { AppleMusicLink, AppleMusicSong, ItunesLookupResponse } from './types';

export function parseAppleMusicLink(link: string): AppleMusicLink {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    throw new Error(`Invalid URL: ${link}`);
  }
  if (!url.hostname.endsWith('music.apple.com')) throw new Error('Not an Apple Music link');

  const [country, type, , id] = url.pathname.split('/').filter(Boolean);
  const trackId = url.searchParams.get('i') ?? (type === 'song' ? id : undefined);
  if (!trackId || !/^\d+$/.test(trackId)) throw new Error('Link does not point to a song (expected /song/... or an album link with ?i=<trackId>)');

  return { trackId, country: /^[a-z]{2}$/i.test(country) ? country.toLowerCase() : 'us' };
}

export async function getAppleMusicSong(link: string): Promise<AppleMusicSong> {
  const { trackId, country } = parseAppleMusicLink(link);
  const response = await fetch(`https://itunes.apple.com/lookup?id=${trackId}&country=${country}`);
  if (!response.ok) throw new Error(`iTunes lookup failed: ${response.status}`);

  const data = (await response.json()) as ItunesLookupResponse;
  const track = data.results.find((result) => result.wrapperType === 'track');
  if (!track?.trackName) throw new Error(`Song not found for track id ${trackId} (${country})`);

  return { name: track.trackName, artist: track.artistName, album: track.collectionName };
}
