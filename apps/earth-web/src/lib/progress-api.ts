import type { GlobeProgressSnapshot } from '../../../../src/shared/worldly/globe-progress';
import { authHeaders } from './auth';

export const hasRemoteIdentity = (): boolean => authHeaders() !== null;

// Pushes the local snapshot; the server merges it into the Telegram user's copy and returns the result.
export async function syncProgressSnapshot(snapshot: GlobeProgressSnapshot): Promise<GlobeProgressSnapshot | null> {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch('/api/worldly/globe/progress/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(snapshot) });
    if (!res.ok) return null;
    const data = (await res.json()) as { readonly snapshot?: GlobeProgressSnapshot };
    return data.snapshot ?? null;
  } catch {
    return null;
  }
}
