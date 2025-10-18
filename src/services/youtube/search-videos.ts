import axios from 'axios';
import { env } from 'node:process';
import { YouTubeSearchResult, YouTubeVideo } from './types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function searchYouTubeVideos(query: string, maxResults: number = 5): Promise<YouTubeSearchResult> {
  try {
    if (!env.YOUTUBE_API_KEY) {
      return {
        success: false,
        error: 'YouTube API key is not configured. Please add YOUTUBE_API_KEY to your environment variables.',
      };
    }

    const searchUrl = `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${env.YOUTUBE_API_KEY}`;

    const response = await axios.get(searchUrl);

    if (response.data.items && response.data.items.length > 0) {
      const videos: YouTubeVideo[] = response.data.items.map((item: any) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      }));

      return {
        success: true,
        videos,
      };
    } else {
      return {
        success: false,
        error: 'No videos found for the given search query.',
      };
    }
  } catch (err) {
    console.error(`Error searching YouTube videos: ${err}`);
    return {
      success: false,
      error: err.response?.data?.error?.message || err.message || 'Unknown error occurred while searching YouTube.',
    };
  }
}
