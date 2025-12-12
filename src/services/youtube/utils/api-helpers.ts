import { env } from 'node:process';
import { sleep } from '@core/utils';
import type { TranscriptJobResponse, YouTubeTranscript } from '../types';

const SUPADATA_API_BASE_URL = 'https://api.supadata.ai/v1';

export function getSupadataHeaders(): Record<string, string> {
  return {
    'x-api-key': env.SUPADATA_API_KEY,
  };
}

export function validateSupadataApiKey(): void {
  if (!env.SUPADATA_API_KEY) {
    throw new Error('SUPADATA_API_KEY is not configured. Sign up at https://supadata.ai');
  }
}

export function getSupadataApiBaseUrl(): string {
  return SUPADATA_API_BASE_URL;
}

export async function pollTranscriptJob(jobId: string, maxAttempts = 30, intervalMs = 2000): Promise<YouTubeTranscript> {
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
