import type {
  ChannelVideosResponse,
  SupadataChannelResponse,
  SupadataChannelVideosResponse,
  SupadataVideoResponse,
  TranscriptResponse,
  YouTubeChannel,
  YouTubeRSSVideo,
  YouTubeTranscript,
  YouTubeVideo,
} from './types';
import { buildRSSFeedUrl, formatChannel, formatVideo, getSupadataApiBaseUrl, getSupadataHeaders, parseRSSFeed, pollTranscriptJob, validateSupadataApiKey } from './utils';

export async function getChannelInfo(channelIdOrHandle: string): Promise<YouTubeChannel> {
  validateSupadataApiKey();

  const url = new URL(`${getSupadataApiBaseUrl()}/youtube/channel`);
  url.searchParams.append('id', channelIdOrHandle);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getSupadataHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get channel info: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as SupadataChannelResponse;
  return formatChannel(data);
}

export async function getChannelVideoIds(channelIdOrHandle: string, limit = 5, type: 'all' | 'video' | 'short' | 'live' = 'video'): Promise<ChannelVideosResponse> {
  validateSupadataApiKey();

  const url = new URL(`${getSupadataApiBaseUrl()}/youtube/channel/videos`);
  url.searchParams.append('id', channelIdOrHandle);
  url.searchParams.append('limit', limit.toString());
  url.searchParams.append('type', type);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getSupadataHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get channel videos: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as SupadataChannelVideosResponse;

  return {
    videoIds: data.videoIds ? [...data.videoIds] : [],
    shortIds: data.shortIds ? [...data.shortIds] : [],
    liveIds: data.liveIds ? [...data.liveIds] : [],
  };
}

export async function getVideoMetadata(videoId: string): Promise<YouTubeVideo> {
  validateSupadataApiKey();

  const url = new URL(`${getSupadataApiBaseUrl()}/youtube/video`);
  url.searchParams.append('id', videoId);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getSupadataHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get video metadata: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as SupadataVideoResponse;
  return formatVideo(data);
}

export async function getNewVideosSince(channelIdOrHandle: string, lastKnownVideoId: string, maxCount = 5): Promise<YouTubeVideo[]> {
  const newVideos: YouTubeVideo[] = [];

  const { videoIds } = await getChannelVideoIds(channelIdOrHandle, maxCount, 'video');

  for (const videoId of videoIds) {
    if (videoId === lastKnownVideoId) {
      break;
    }

    try {
      const video = await getVideoMetadata(videoId);
      newVideos.push(video);
    } catch {
      // Skip failed videos
    }
  }

  return newVideos;
}

export async function getTranscript(videoUrl: string, lang?: string): Promise<YouTubeTranscript> {
  validateSupadataApiKey();

  const url = new URL(`${getSupadataApiBaseUrl()}/transcript`);
  url.searchParams.append('url', videoUrl);
  if (lang) {
    url.searchParams.append('lang', lang);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getSupadataHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get transcript: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as TranscriptResponse;

  // Handle async job processing
  if (data.jobId) {
    return await pollTranscriptJob(data.jobId);
  }

  const content = (data.content as any)?.map((c) => c.text).join(' ') || '';

  return {
    content,
    lang: data.lang,
  };
}

export async function getTranscriptText(videoUrl: string, lang?: string): Promise<string> {
  const transcript = await getTranscript(videoUrl, lang);

  if (typeof transcript.content === 'string') {
    return transcript.content;
  }

  if (Array.isArray(transcript.content)) {
    return transcript.content.map((chunk) => chunk.text).join(' ');
  }

  return '';
}

export async function getVideosFromRSS(channelId: string): Promise<YouTubeRSSVideo[]> {
  const rssUrl = buildRSSFeedUrl(channelId);

  const response = await fetch(rssUrl);

  if (!response.ok) {
    throw new Error(`RSS feed error: ${response.status}`);
  }

  const xmlText = await response.text();
  return parseRSSFeed(xmlText);
}
