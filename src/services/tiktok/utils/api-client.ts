import { env } from 'node:process';
import { extractVideoInfo } from '.';
import { DEFAULT_API_PARAMS, DEFAULT_HEADERS, TIKTOK_API_ENDPOINT, TIKTOK_BASE_URL } from '../constants';
import type { TikTokApiResponse, TikTokVideo } from '../types';
import { fetchUserInfo } from './user-info';

export async function fetchVideosFromAPI(username: string, count?: number): Promise<TikTokVideo[]> {
  try {
    // Step 1: Get user information (secUid)
    console.log(`Fetching user info for @${username}...`);
    const userInfo = await fetchUserInfo(username);
    console.log(`Found user ID: ${userInfo.id}, secUid: ${userInfo.secUid}`);

    // Step 2: Build API URL with parameters
    const apiUrl = buildApiUrl(userInfo.secUid, count);
    console.log('Fetching from internal API...');

    // Step 3: Fetch videos from API (with optional proxy)
    const fetchUrl = buildFetchUrl(apiUrl);
    const fetchOptions = buildFetchOptions(username);

    const response = await fetch(fetchUrl, fetchOptions);

    console.log(`API Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error Response Body: ${errorBody.substring(0, 500)}`);
      throw new Error(`API returned status: ${response.status} ${response.statusText}`);
    }

    // Get response text first to handle empty/malformed responses
    const responseText = await response.text();
    console.log(`API Response Length: ${responseText.length} bytes`);

    if (!responseText || responseText.trim().length === 0) {
      console.error('API returned empty response body');
      throw new Error('API returned empty response - likely blocked by TikTok');
    }

    let data: TikTokApiResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`Failed to parse JSON. Response body (first 500 chars): ${responseText.substring(0, 500)}`);
      throw new Error(`Invalid JSON response from TikTok API: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Step 4: Extract and format video information
    if (!data.itemList || !Array.isArray(data.itemList)) {
      console.warn('API response does not contain itemList');
      return [];
    }

    const videos = data.itemList.map((item) => extractVideoInfo(item, username));
    console.log(`Successfully fetched ${videos.length} videos from API`);

    return videos;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to fetch videos from API:', errorMessage);
    throw error;
  }
}

function buildApiUrl(secUid: string, count?: number): string {
  // TikTok API max is 30, request more than needed if count is specified
  // to ensure we have enough after sorting
  const requestCount = count ? Math.min(Math.max(count, 30), 30) : 30;

  const params = new URLSearchParams({
    ...DEFAULT_API_PARAMS,
    count: requestCount.toString(),
    secUid,
    device_id: generateDeviceId(),
    msToken: '', // TikTok sometimes requires this but empty works
  });

  return `${TIKTOK_API_ENDPOINT}?${params.toString()}`;
}

function generateDeviceId(): string {
  const min = BigInt('7000000000000000000');
  const max = BigInt('7999999999999999999');
  const range = max - min;
  const random = BigInt(Math.floor(Math.random() * Number(range)));
  return (min + random).toString();
}

function buildFetchUrl(apiUrl: string): string {
  const scraperApiKey = env.SCRAPERAPI_API_KEY;

  if (scraperApiKey) {
    console.log('Using ScraperAPI proxy...');
    // ScraperAPI format: http://api.scraperapi.com?api_key=KEY&url=TARGET_URL
    const encodedUrl = encodeURIComponent(apiUrl);
    return `http://api.scraperapi.com?api_key=${scraperApiKey}&url=${encodedUrl}`;
  }

  console.log('Using direct connection (no proxy)...');
  return apiUrl;
}

function buildFetchOptions(username: string): RequestInit {
  const scraperApiKey = env.SCRAPERAPI_API_KEY;

  if (scraperApiKey) {
    return {
      method: 'GET',
    };
  }

  return {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'application/json, text/plain, */*',
      Referer: `${TIKTOK_BASE_URL}/@${username}`,
      Origin: TIKTOK_BASE_URL,
    },
  };
}
