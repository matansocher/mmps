import type { RapidAPIUserPostsResponse, TikTokTranscript, TikTokUserInfo, TikTokVideo, TranscriptResponse, UserVideosResponse } from './types';
import {
  extractSecUid,
  fetchUserInfo,
  formatUserInfo,
  formatVideo,
  getRapidApiHeaders,
  getSupadataApiBaseUrl,
  getSupadataHeaders,
  getTikTokApiBaseUrl,
  pollTranscriptJob,
  validateRapidApiKey,
  validateSupadataApiKey,
} from './utils';

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

  const url = new URL(`${getTikTokApiBaseUrl()}/api/user/posts`);
  url.searchParams.append('secUid', secUid);
  url.searchParams.append('count', count.toString());
  if (cursor) {
    url.searchParams.append('cursor', cursor);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getRapidApiHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get user videos: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as RapidAPIUserPostsResponse;
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
