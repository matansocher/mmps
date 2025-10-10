import { getLatestVideos } from '.';
import type { FetchResult } from '../types';
import { fetchVideosFromAPI } from './api-client';

export async function fetchUserVideos(username: string, count?: number): Promise<FetchResult> {
  console.log(`Fetching videos for @${username}...`);

  try {
    const videos = await fetchVideosFromAPI(username, count);

    if (videos.length > 0) {
      const finalVideos = count ? getLatestVideos(videos, count) : videos;

      return {
        videos: finalVideos,
        source: 'api',
      };
    }

    throw new Error('No videos found');
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to fetch videos:`, errMessage);
    return {
      videos: [],
      source: 'api',
      error: errMessage,
    };
  }
}
