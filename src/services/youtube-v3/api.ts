import axios from 'axios';
import { env } from 'node:process';
import { YoutubeTranscript } from 'youtube-transcript-plus';
import { Innertube, UniversalCache } from 'youtubei.js';
import { parseTranscriptXml } from '@services/youtube-v3/utils';
import type { Video, YouTubeChannelResponse, YouTubeSearchResponse } from './types';

const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

let innertube: Innertube | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!innertube) {
    innertube = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
    });
  }
  return innertube;
}

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
  try {
    console.log(`fetchTranscript: Fetching transcript for videoId: ${videoId} using Innertube direct URL`);
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);

    if (info.captions?.caption_tracks?.length <= 0) {
      console.log(`fetchTranscript: No captions found for videoId: ${videoId}`);
      return null;
    }
    const track = info.captions.caption_tracks.find((t) => t.language_code === 'en') || info.captions.caption_tracks[0];

    console.log(`fetchTranscript: Found caption track: ${track.name.text} (${track.language_code})`);

    const response = await axios.get(track.base_url);
    const fullText = parseTranscriptXml(response.data);

    console.log(`fetchTranscript: Successfully fetched and parsed transcript for videoId: ${videoId}, transcript: ${fullText.substring(0, 100)}...`);

    if (fullText) {
      return fullText;
    }

    console.log(`fetchTranscript: No captions found in metadata for videoId: ${videoId}. Trying fallback...`);
  } catch (error) {
    console.warn(`fetchTranscript: Innertube direct fetch failed for videoId: ${videoId}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
