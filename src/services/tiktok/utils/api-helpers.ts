import { env } from 'node:process';
import { sleep } from '@core/utils';
import type { RapidAPIUserInfoResponse, TikTokTranscript, TranscriptJobResponse } from '../types';

const TIKTOK_API_HOST = 'tiktok-api23.p.rapidapi.com';
const TIKTOK_API_BASE_URL = `https://${TIKTOK_API_HOST}`;
const SUPADATA_API_BASE_URL = 'https://api.supadata.ai/v1';

export function getRapidApiHeaders(): Record<string, string> {
  return {
    'x-rapidapi-key': env.RAPIDAPI_TIKTOK_KEY,
    'x-rapidapi-host': TIKTOK_API_HOST,
  };
}

export function getSupadataHeaders(): Record<string, string> {
  return {
    'x-api-key': env.SUPADATA_API_KEY,
  };
}

export function validateRapidApiKey(): void {
  if (!env.RAPIDAPI_TIKTOK_KEY) {
    throw new Error('RAPIDAPI_TIKTOK_KEY is not configured. Sign up at https://rapidapi.com');
  }
}

export function validateSupadataApiKey(): void {
  if (!env.SUPADATA_API_KEY) {
    throw new Error('SUPADATA_API_KEY is not configured. Sign up at https://supadata.ai');
  }
}

export function getTikTokApiBaseUrl(): string {
  return TIKTOK_API_BASE_URL;
}

export function getSupadataApiBaseUrl(): string {
  return SUPADATA_API_BASE_URL;
}

// The API occasionally returns an empty 200 body — retry a couple of times.
export async function rapidApiGet<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const url = new URL(`${TIKTOK_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url.toString(), { method: 'GET', headers: getRapidApiHeaders() });
    const body = await response.text();
    if (response.ok && body) {
      return JSON.parse(body) as T;
    }
    if (attempt === maxAttempts) {
      throw new Error(`${path} failed: HTTP ${response.status} - ${body || '(empty body)'}`);
    }
    await sleep(1500);
  }
  throw new Error(`${path} failed`);
}

export async function fetchUserInfo(username: string): Promise<RapidAPIUserInfoResponse> {
  return rapidApiGet<RapidAPIUserInfoResponse>('/api/user/info', { uniqueId: username });
}

export async function pollTranscriptJob(jobId: string, maxAttempts = 30, intervalMs = 2000): Promise<TikTokTranscript> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const url = new URL(`${SUPADATA_API_BASE_URL}/transcript/job/${jobId}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getSupadataHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Transcript job error: ${response.status}`);
    }

    const data = (await response.json()) as TranscriptJobResponse;

    if (data.status === 'completed' && data.result) {
      return data.result;
    } else if (data.status === 'failed') {
      throw new Error(`Transcript job failed: ${data.error || 'Unknown error'}`);
    }

    await sleep(intervalMs);
  }

  throw new Error('Transcript job timed out');
}
