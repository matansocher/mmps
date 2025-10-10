import type { FetchResult } from '../types';
import { fetchVideosFromAPI } from './api-client';
import { getLatestVideos } from './video-extractor';

/**
 * Main function to fetch TikTok user videos
 * Fetches videos from TikTok API and sorts/limits by count
 */
export async function fetchUserVideos(username: string, count?: number): Promise<FetchResult> {
  console.log(`Fetching videos for @${username}...`);

  try {
    // Fetch videos from API
    const videos = await fetchVideosFromAPI(username, count);

    if (videos.length > 0) {
      // Sort and limit to count if specified
      const finalVideos = count ? getLatestVideos(videos, count) : videos;

      return {
        videos: finalVideos,
        source: 'api',
      };
    }

    // No videos found
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
