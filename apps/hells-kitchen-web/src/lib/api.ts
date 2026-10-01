import { parseSave } from '../../../../src/features/hells-kitchen/game/schema';
import type { Save } from '../../../../src/features/hells-kitchen/game/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
  }
}
export async function request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const response = await fetch(`/api/hells-kitchen/${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 204) return null;
  const value = await response.json();
  if (!response.ok) throw new ApiError(response.status, value, typeof value?.error === 'string' ? value.error : 'The server is unavailable.');
  return value;
}
export async function getSave(): Promise<Save> {
  const save = parseSave(await request('profile'));
  if (!save) throw new Error('The server returned an invalid save.');
  return save;
}
export async function putSave(save: Save): Promise<Save> {
  const result = parseSave(await request('profile', 'PUT', { revision: save.revision, profile: save.profile }));
  if (!result) throw new Error('The server returned an invalid save.');
  return result;
}
