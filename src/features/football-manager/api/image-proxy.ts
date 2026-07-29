import axios from 'axios';
import type { Request, Response } from 'express';
import { Logger } from '@core/utils';
import { SOFIFA_CDN_BASE } from '@services/ea-fc-data';

const logger = new Logger('FootballManagerImageProxy');

// Path prefix the SPA hits; the remainder maps 1:1 onto the sofifa CDN path.
export const IMAGE_PROXY_PREFIX = '/api/football-manager/img';

// The CDN hotlink-protects by Referer/Origin, so browsers get 403. We fetch it
// server-side (no browser Referer) and stream the bytes back with a long cache.
const CDN_ORIGIN = new URL(SOFIFA_CDN_BASE).origin;

// Rewrites an absolute sofifa CDN URL into a same-origin proxy URL. Non-CDN
// URLs (or empty values) are returned untouched.
export function toProxyUrl(url: string | undefined | null): string | undefined | null {
  if (!url) return url;
  if (!url.startsWith(`${CDN_ORIGIN}/`)) return url;
  return `${IMAGE_PROXY_PREFIX}${url.slice(CDN_ORIGIN.length)}`;
}

export async function handleImageProxy(req: Request, res: Response): Promise<void> {
  // Everything after the prefix is the CDN path (e.g. /players/231/747/26_120.png).
  const cdnPath = req.path.slice(IMAGE_PROXY_PREFIX.length);
  if (!/^\/[\w./-]+\.(png|jpg|jpeg|webp|gif|svg)$/i.test(cdnPath)) {
    res.status(400).json({ error: 'invalid_image_path' });
    return;
  }

  try {
    const upstream = await axios.get<ArrayBuffer>(`${CDN_ORIGIN}${cdnPath}`, {
      responseType: 'arraybuffer',
      // Do NOT forward the browser Referer/Origin — that is what triggers the 403.
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
      timeout: 10_000,
      validateStatus: (s) => s >= 200 && s < 500,
    });

    if (upstream.status !== 200) {
      res.status(upstream.status).end();
      return;
    }

    const contentType = upstream.headers['content-type'];
    res.setHeader('Content-Type', typeof contentType === 'string' ? contentType : 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
    res.status(200).send(Buffer.from(upstream.data));
  } catch (err) {
    logger.error(`image proxy failed for ${cdnPath}: ${err}`);
    res.status(502).end();
  }
}
