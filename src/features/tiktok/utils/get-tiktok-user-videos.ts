import puppeteer, { Browser, Page } from 'puppeteer';
import { sleep } from '@core/utils';

type TikTokVideo = {
  id: string;
  url: string;
  description: string;
  uploadDate: string;
};

export async function getTikTokUserVideos(username: string): Promise<TikTokVideo[]> {
  const browser: Browser = await puppeteer.launch({ headless: true });
  const page: Page = await browser.newPage();
  let videoPage: Page | null = null;

  try {
    await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-e2e="user-post-item"]', { timeout: 10000 });

    // Scroll once to ensure thumbnails load
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1000);

    // Grab basic data (id, url, description). uploadDate left empty to fill later.
    const videos: TikTokVideo[] = await page.evaluate(() => {
      const videoElements = document.querySelectorAll('[data-e2e="user-post-item"]');
      const videoData: TikTokVideo[] = [];

      for (const element of Array.from(videoElements).slice(0, 10)) {
        const link = element.querySelector('a[href*="/video/"]');
        if (!link) continue;

        const url = link instanceof HTMLAnchorElement ? link.href : link.getAttribute('href') || '';
        const urlMatch = url.match(/\/video\/(\d+)/);
        if (!urlMatch) continue;

        const img = element.querySelector('img');
        const description = img?.getAttribute('alt')?.substring(0, 100) || '';

        videoData.push({
          id: urlMatch[1],
          url,
          description,
          uploadDate: '',
        });
      }
      return videoData.slice(0, 5);
    });

    // If no videos found, return early
    if (videos.length === 0) return [];

    // Reuse a single page to visit each video and try to extract upload date
    videoPage = await browser.newPage();

    for (const v of videos) {
      try {
        const videoUrl = v.url.startsWith('http') ? v.url : `https://www.tiktok.com${v.url}`;
        await videoPage.goto(videoUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const uploadDate = await videoPage.evaluate(() => {
          // 1) Prefer <time datetime="...">
          const timeEl = document.querySelector('time');
          if (timeEl) {
            const dt = timeEl.getAttribute('datetime') || timeEl.textContent?.trim();
            if (dt) return dt.split('T')[0]; // YYYY-MM-DD
          }

          // 2) Look for numeric createTime inside inline scripts/state
          const scripts = Array.from(document.scripts)
            .map((s) => s.textContent || '')
            .join(' ');
          const m = scripts.match(/createTime\"\s*:\s*\"?(\d{9,13})\"?/);
          if (m) {
            const ts = parseInt(m[1], 10);
            // createTime is often seconds; convert to ms if needed
            const ms = ts > 1e12 ? ts : ts * 1000;
            const d = new Date(ms);
            return d.toISOString().slice(0, 10);
          }

          // 3) Fallback: any ISO-like date in the page
          const iso = scripts.match(/\d{4}-\d{2}-\d{2}/);
          if (iso) return iso[0];

          return '';
        });

        v.uploadDate = uploadDate || '';
      } catch (err) {
        // per-video error: continue and keep uploadDate empty
        v.uploadDate = v.uploadDate || '';
      }
    }

    return videos;
  } catch (error) {
    console.error('Error fetching TikTok videos:', error instanceof Error ? error.message : String(error));
    return [];
  } finally {
    if (videoPage) await videoPage.close();
    await browser.close();
  }
}
