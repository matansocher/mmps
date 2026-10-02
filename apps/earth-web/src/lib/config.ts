import type { EarthConfig } from '../types';

export async function fetchEarthConfig(): Promise<EarthConfig> {
  const response = await fetch('/api/earth/config', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(response.status === 503 ? 'Earth is not configured on the server (missing Google Maps key).' : `Config request failed (${response.status})`);
  return (await response.json()) as EarthConfig;
}
