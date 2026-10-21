import { getErrorMessage, Logger } from '@core/utils';
import type {
  RapidAPIDownloadResponse,
  RapidAPIUserPostsResponse,
  TikTokPost,
  TikTokTranscript,
  TikTokUserInfo,
  TikTokVideo,
  TikTokVideoDetails,
  TikwmResponse,
  TranscriptResponse,
  UserVideosResponse,
} from './types';
import {
  extractSecUid,
  fetchUserInfo,
  formatUserInfo,
  formatVideo,
  getSupadataApiBaseUrl,
  getSupadataHeaders,
  pollTranscriptJob,
  rapidApiGet,
  validateRapidApiKey,
  validateSupadataApiKey,
} from './utils';

const logger = new Logger('tiktok:api');

// Single-shot timeout for resolving a fresh download URL. tikwm is a best-effort free
// endpoint; if it hangs we want to fall back to RapidAPI promptly rather than block a run.
const DOWNLOAD_URL_TIMEOUT_MS = 10_000;

function parseVideosResponse(data: RapidAPIUserPostsResponse): UserVideosResponse {
  const itemList = data.data?.itemList || data.itemList || [];
  const hasMore = data.data?.hasMore ?? data.hasMore ?? false;
  const responseCursor = data.data?.cursor || data.cursor || '';

  const videos: TikTokVideo[] = [...itemList].map((item) => formatVideo(item));

  return {
    videos,
    hasMore,
    cursor: responseCursor,
  };
}

export async function getUserInfo(username: string): Promise<TikTokUserInfo> {
  validateRapidApiKey();

  const data = await fetchUserInfo(username);

  if (!data.userInfo?.user) {
    throw new Error(`User @${username} not found`);
  }

  return formatUserInfo(data, username);
}

export async function getUserSecUid(username: string): Promise<string> {
  validateRapidApiKey();

  const data = await fetchUserInfo(username);
  const secUid = extractSecUid(data);

  if (!secUid) {
    throw new Error(`Could not get secUid for user @${username}`);
  }

  return secUid;
}

export async function getUserVideosBySecUid(secUid: string, count = 5, cursor?: string): Promise<UserVideosResponse> {
  validateRapidApiKey();

  const params: Record<string, string | number> = { secUid, count };
  if (cursor) {
    params.cursor = cursor;
  }

  const data = await rapidApiGet<RapidAPIUserPostsResponse>('/api/user/posts', params);
  return parseVideosResponse(data);
}

export async function getUserVideos(username: string, count = 5, cursor?: string): Promise<UserVideosResponse> {
  const secUid = await getUserSecUid(username);
  return getUserVideosBySecUid(secUid, count, cursor);
}

export async function getNewVideosSince(username: string, lastKnownVideoId: string, maxCount = 5): Promise<TikTokVideo[]> {
  const newVideos: TikTokVideo[] = [];
  let cursor: string | undefined;
  let found = false;
  let totalFetched = 0;

  while (!found && totalFetched < maxCount) {
    const response = await getUserVideos(username, 5, cursor);

    for (const video of response.videos) {
      if (video.id === lastKnownVideoId) {
        found = true;
        break;
      }
      newVideos.push(video);
      totalFetched++;
    }

    if (!response.hasMore || found) {
      break;
    }

    cursor = response.cursor;
  }

  return newVideos;
}

export async function getTranscript(videoUrl: string): Promise<TikTokTranscript> {
  validateSupadataApiKey();

  const url = new URL(`${getSupadataApiBaseUrl()}/transcript`);
  url.searchParams.append('url', videoUrl);

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

  return {
    content: data.content || '',
    lang: data.lang,
    duration: data.duration,
  };
}

export async function getTranscriptText(videoUrl: string): Promise<string> {
  const transcript = await getTranscript(videoUrl);

  if (typeof transcript.content === 'string') {
    return transcript.content;
  }

  if (Array.isArray(transcript.content)) {
    return transcript.content.map((chunk) => chunk.text).join(' ');
  }

  return '';
}

// The playAddr returned by /api/user/posts is session-bound (403s outside the proxy),
// so resolve a fresh downloadable URL: tikwm (free) first, RapidAPI download as fallback.
// Each provider is attempted at most once here (RapidAPI adds its own bounded internal
// retries), so the fallback can't multiply into an unbounded retry storm.
async function fetchTikwmVideo(videoUrl: string): Promise<TikwmResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_URL_TIMEOUT_MS);
  try {
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`tikwm returned HTTP ${response.status}`);
    }
    return (await response.json()) as TikwmResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTikwmDownloadUrl(videoUrl: string): Promise<string | null> {
  try {
    const data = await fetchTikwmVideo(videoUrl);
    if (data.code === 0 && data.data?.play) {
      return data.data.play;
    }
    logger.warn(`tikwm returned no playable url for ${videoUrl} (code ${data.code})`);
    return null;
  } catch (err) {
    logger.warn(`tikwm download url lookup failed for ${videoUrl}: ${getErrorMessage(err)}`);
    return null;
  }
}

// Works with any TikTok video link, including vt.tiktok.com / vm.tiktok.com short links.
export async function getVideoDetails(videoUrl: string): Promise<TikTokVideoDetails> {
  const tikwm = await fetchTikwmVideo(videoUrl).catch((err) => {
    logger.warn(`tikwm video lookup failed for ${videoUrl}: ${getErrorMessage(err)}`);
    return null;
  });
  const data = tikwm?.code === 0 ? tikwm.data : undefined;
  const author = data?.author?.unique_id ?? null;
  const canonicalUrl = data?.id && author ? `https://www.tiktok.com/@${author}/video/${data.id}` : videoUrl;

  const transcript = await getTranscriptText(canonicalUrl)
    .then((text) => text.trim() || null)
    .catch((err) => {
      logger.warn(`transcript lookup failed for ${canonicalUrl}: ${getErrorMessage(err)}`);
      return null;
    });

  if (!data && !transcript) {
    throw new Error(`Could not fetch TikTok video ${videoUrl}`);
  }

  return {
    id: data?.id ?? null,
    url: canonicalUrl,
    description: data?.title || null,
    author,
    authorName: data?.author?.nickname ?? null,
    duration: data?.duration ?? null,
    createdAt: data?.create_time ? new Date(data.create_time * 1000).toISOString() : null,
    stats: {
      views: data?.play_count ?? null,
      likes: data?.digg_count ?? null,
      comments: data?.comment_count ?? null,
      shares: data?.share_count ?? null,
      saves: data?.collect_count ?? null,
    },
    transcript,
  };
}

export async function getVideoDownloadUrl(videoUrl: string): Promise<string> {
  const tikwmUrl = await fetchTikwmDownloadUrl(videoUrl);
  if (tikwmUrl) {
    return tikwmUrl;
  }

  validateRapidApiKey();
  const data = await rapidApiGet<RapidAPIDownloadResponse>('/api/download/video', { url: videoUrl });
  const play = data.play || data.data?.play;
  if (!play) {
    throw new Error(`No downloadable video url found for ${videoUrl}`);
  }
  return play;
}

export async function getLatestPosts(username: string, count = 5): Promise<TikTokPost[]> {
  const { videos } = await getUserVideos(username, count);

  return Promise.all(
    videos.slice(0, count).map(async (video) => {
      const [downloadUrl, transcript] = await Promise.all([
        getVideoDownloadUrl(video.url).catch(() => null),
        getTranscriptText(video.url)
          .then((text) => text.trim() || null)
          .catch(() => null),
      ]);
      return { ...video, downloadUrl, transcript };
    }),
  );
}
