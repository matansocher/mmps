import axios from 'axios';
import { env } from 'node:process';
import type { Video, YouTubeChannelResponse, YouTubeSearchResponse } from './types';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function getChannelIdFromHandle(handle: string): Promise<string> {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }

  const cleanHandle = handle.replace('@', '');

  if (cleanHandle.startsWith('UC') && cleanHandle.length === 24) {
    return cleanHandle;
  }

  const url = `${YOUTUBE_API_BASE_URL}/channels?part=id&forHandle=${cleanHandle}&key=${apiKey}`;

  const res = await fetch(url);
  const data = (await res.json()) as YouTubeChannelResponse;

  if (data.items && data.items.length > 0) {
    return data.items[0].id;
  }
  throw new Error('Channel not found');
}

export async function getRecentVideos(channelId: string, limit = 2): Promise<Video[]> {
  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }

  const url = `${YOUTUBE_API_BASE_URL}/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${limit}&type=video`;

  const response = await fetch(url);
  const data = (await response.json()) as YouTubeSearchResponse;

  if (data.error) {
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  return data.items.map((v) => {
    const { id, etag, snippet } = v;
    const { channelTitle, title, description, publishedAt, thumbnails } = snippet;
    return { id: id.videoId, etag, channelTitle, title, description, publishedAt, thumbnail: thumbnails.high.url };
  });
}

export async function fetchTranscript(videoId: string): Promise<string> {
  const rapidApiKey = env.RAPIDAPI_KEY;
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY not configured');
  }

  try {
    console.log(`fetchTranscript: Fetching transcript for videoId: ${videoId} using RapidAPI`);

    const response = await axios.get('https://youtube-transcriptor.p.rapidapi.com/transcript', {
      params: {
        video_id: videoId,
        lang: 'en',
      },
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': 'youtube-transcriptor.p.rapidapi.com',
      },
    });

    if (!response.data || response.data.error) {
      console.log(`fetchTranscript: No transcript available for videoId: ${videoId}`);
      return null;
    }

    if (Array.isArray(response.data)) {
      const fullText = response.data[0].transcriptionAsText;
      console.log(`fetchTranscript: Successfully fetched transcript for videoId: ${videoId}, length: ${fullText.length} characters`);
      return fullText;
    }

    console.log(`fetchTranscript: Unexpected response format for videoId: ${videoId}`);
    return null;
  } catch (err) {
    console.error(`fetchTranscript: Failed to fetch transcript for videoId: ${videoId}: ${err.message}`);
    return null;
  }
}
