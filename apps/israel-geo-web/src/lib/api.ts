import type { Coordinates, DailyGameSession, GameSession, PlayerProfile, PublicProfile, RoundResult, ShareTokenResponse } from '../types';
import { getInitData } from './telegram';

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (response.ok) return body as T;
  const err = (body as { error?: string }).error ?? `Request failed (${response.status})`;
  throw new Error(err);
}

function authHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': getInitData() };
}

export async function getProfile(): Promise<PlayerProfile> {
  return parseResponse<PlayerProfile>(await fetch('/israel-geo/api/profile', { headers: authHeaders() }));
}

export async function updateProfile(data: { readonly displayName?: string; readonly avatarId?: string }): Promise<PlayerProfile> {
  return parseResponse<PlayerProfile>(await fetch('/israel-geo/api/profile', { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data) }));
}

export async function createShareToken(): Promise<ShareTokenResponse> {
  return parseResponse<ShareTokenResponse>(await fetch('/israel-geo/api/profile/share-token', { method: 'POST', headers: authHeaders() }));
}

export async function getPublicProfile(token: string): Promise<PublicProfile> {
  return parseResponse<PublicProfile>(await fetch(`/israel-geo/api/public-profiles/${encodeURIComponent(token)}`));
}

export async function createSession(): Promise<GameSession> {
  return parseResponse<GameSession>(await fetch('/israel-geo/api/sessions', { method: 'POST', headers: authHeaders() }));
}

export async function createDailySession(): Promise<DailyGameSession> {
  return parseResponse<DailyGameSession>(await fetch('/israel-geo/api/daily-route/session', { method: 'POST', headers: authHeaders() }));
}

export async function submitGuess(sessionId: string, round: number, coordinates: Coordinates, radiusKm: number): Promise<RoundResult> {
  return parseResponse<RoundResult>(
    await fetch(`/israel-geo/api/sessions/${encodeURIComponent(sessionId)}/guesses`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ round, ...coordinates, radiusKm }),
    }),
  );
}

export async function purchaseCosmetic(cosmeticId: string): Promise<PlayerProfile> {
  return parseResponse<PlayerProfile>(await fetch(`/israel-geo/api/cosmetics/${encodeURIComponent(cosmeticId)}/purchase`, { method: 'POST', headers: authHeaders() }));
}

export async function equipCosmetic(cosmeticId: string): Promise<PlayerProfile> {
  return parseResponse<PlayerProfile>(await fetch(`/israel-geo/api/cosmetics/${encodeURIComponent(cosmeticId)}/equip`, { method: 'POST', headers: authHeaders() }));
}

export async function previewCosmetic(cosmeticId: string): Promise<PlayerProfile> {
  return parseResponse<PlayerProfile>(await fetch('/israel-geo/api/cosmetics/preview', { method: 'POST', headers: authHeaders(), body: JSON.stringify({ cosmeticId }) }));
}
