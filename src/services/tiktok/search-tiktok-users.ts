import { sleep } from '@core/utils';
import { getBrowser } from '@services/tiktok/get-browser';

export type TikTokUserSearchResult = {
  readonly username: string;
  readonly displayName: string;
  readonly followerCount?: string;
  readonly isVerified?: boolean;
  readonly profilePicture?: string;
};

export async function searchTikTokUsers(query: string): Promise<TikTokUserSearchResult[]> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const searchUrl = `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    await page.waitForSelector('[data-e2e="search-user-container"]', { timeout: 10000 }).catch(() => {
      return page.waitForSelector('div[class*="user-container"]', { timeout: 5000 }).catch(() => null);
    });

    await sleep(2000);

    const users: TikTokUserSearchResult[] = await page.evaluate(() => {
      const userElements = document.querySelectorAll('[data-e2e="search-user-container"], div[class*="user-container"]');
      const results: TikTokUserSearchResult[] = [];

      for (const element of Array.from(userElements).slice(0, 10)) {
        try {
          const usernameElement = element.querySelector('a[href*="/@"]') || element.querySelector('[data-e2e="search-user-unique-id"]');
          let username = '';

          if (usernameElement) {
            const href = usernameElement.getAttribute('href');
            if (href) {
              const match = href.match(/@([^/?]+)/);
              username = match ? match[1] : '';
            }
            if (!username) {
              username = usernameElement.textContent?.replace('@', '').trim() || '';
            }
          }

          if (!username) {
            const textContent = element.textContent || '';
            const usernameMatch = textContent.match(/@?([a-zA-Z0-9_.]+)/);
            username = usernameMatch ? usernameMatch[1] : '';
          }

          if (!username) continue;

          const displayNameElement = element.querySelector('[data-e2e="search-user-title"]') || element.querySelector('h3') || element.querySelector('p[class*="title"]');
          const displayName = displayNameElement?.textContent?.trim() || username;

          const followerElement = element.querySelector('[data-e2e="search-user-followers"]') || element.querySelector('span[class*="follower"]') || element.querySelector('p[class*="subtitle"]');
          let followerCount = '';
          if (followerElement) {
            const followerText = followerElement.textContent || '';
            const followerMatch = followerText.match(/[\d.]+[KMB]?\s*(Followers?|followers?)/i);
            if (followerMatch) {
              followerCount = followerMatch[0].replace(/\s*Followers?/i, '').trim();
            }
          }

          const isVerified = !!element.querySelector('svg[data-e2e="verified-badge"]') || !!element.querySelector('[class*="verified"]') || !!element.querySelector('circle[fill*="20D5EC"]');

          const profileImg = element.querySelector('img[class*="avatar"]') || element.querySelector('img[src*="tiktok"]');
          const profilePicture = profileImg?.getAttribute('src') || undefined;

          results.push({
            username,
            displayName,
            followerCount: followerCount || undefined,
            isVerified,
            profilePicture,
          });
        } catch (err) {
          continue;
        }
      }

      return results.slice(0, 5);
    });

    if (users.length === 0) {
      const simpleUsers = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href*="/@"]'));
        const results: TikTokUserSearchResult[] = [];

        for (const link of links.slice(0, 5)) {
          const href = link.getAttribute('href');
          if (!href) continue;

          const match = href.match(/@([^/?]+)/);
          if (match) {
            const username = match[1];
            const parentElement = link.closest('div');
            const displayName = parentElement?.querySelector('h3')?.textContent || parentElement?.querySelector('p')?.textContent || username;

            results.push({
              username,
              displayName: displayName.trim(),
              isVerified: false,
            });
          }
        }

        return results;
      });

      return simpleUsers;
    }

    return users;
  } catch (error) {
    console.error('Error searching TikTok users:', error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    await browser.close();
  }
}
