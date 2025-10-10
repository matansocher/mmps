import * as cheerio from 'cheerio';
import { DEFAULT_HEADERS, TIKTOK_BASE_URL } from '../constants';
import type { TikTokUniversalData, TikTokUser } from '../types';

/**
 * Fetch TikTok user information from their profile page
 */
export async function fetchUserInfo(username: string): Promise<TikTokUser> {
  const userPageUrl = `${TIKTOK_BASE_URL}/@${username}`;

  const response = await fetch(userPageUrl, {
    headers: {
      ...DEFAULT_HEADERS,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract user data from embedded JSON
  const scriptTag = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__');
  if (!scriptTag.length) {
    throw new Error('Could not find user data in page');
  }

  const jsonData: TikTokUniversalData = JSON.parse(scriptTag.html() || '{}');
  const userInfo = jsonData.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;

  if (!userInfo?.user) {
    throw new Error('Could not extract user info from page data');
  }

  return {
    id: userInfo.user.id,
    secUid: userInfo.user.secUid,
    username,
  };
}
