import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { LOCAL_FILES_PATH } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getVideoDownloadUrl } from './api';

const logger = new Logger('tiktok:download-video');

const DEFAULT_MAX_BYTES = 49_000_000;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_REDIRECTS = 5;
// A real TikTok mp4 is far larger than this. A download that yields fewer bytes (a 0-byte body,
// or a resolver that 200s with an empty/placeholder response) would otherwise be sent as a broken
// empty video, so we treat it as a failure and let the caller fall back to a link.
const MIN_VIABLE_BYTES = 1024;

export type DownloadTikTokVideoOptions = {
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
  readonly destDir?: string;
};

export type DownloadedVideo = {
  readonly path: string;
  readonly bytes: number;
};

// Rejects any address that would let a resolved (or redirected) download URL reach a private,
// loopback, link-local or otherwise reserved host — the core SSRF guard. Covers the IPv4 and
// IPv6 ranges called out in the design plus the unspecified address.
export function isPrivateIp(address: string): boolean {
  const ip = address.toLowerCase();

  // IPv4-mapped IPv6 (::ffff:a.b.c.d) is evaluated on its embedded IPv4.
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isPrivateIp(mapped[1]);
  }

  if (ip.includes('.')) {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return true; // malformed → treat as unsafe
    }
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8 (incl. 0.0.0.0)
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    return false;
  }

  // IPv6
  if (ip === '::' || ip === '::1') return true; // unspecified / loopback
  if (ip.startsWith('fe80') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true; // fe80::/10 link-local
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // fc00::/7 unique-local
  return false;
}

async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`invalid download url: ${rawUrl}`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`unsupported download url scheme: ${url.protocol}`);
  }
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length) {
    throw new Error(`could not resolve download host: ${url.hostname}`);
  }
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`download host resolves to a blocked address (${address}): ${url.hostname}`);
    }
  }
  return url;
}

// Follows redirects manually so every hop's Location is re-validated against the SSRF guard,
// then returns the final 2xx response ready to stream. `fetch`'s automatic redirect handling
// would skip that per-hop validation.
async function fetchWithValidatedRedirects(startUrl: string, signal: AbortSignal, maxRedirects: number): Promise<Response> {
  let currentUrl = await assertPublicUrl(startUrl);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const response = await fetch(currentUrl, { redirect: 'manual', signal });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`redirect (${response.status}) without a Location header`);
      }
      currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
      continue;
    }
    if (!response.ok) {
      throw new Error(`download request failed: HTTP ${response.status}`);
    }
    return response;
  }
  throw new Error(`too many redirects (>${maxRedirects})`);
}

// Streams the response body to disk, aborting the moment the byte cap is exceeded so a
// missing or lying Content-Length can't push an unbounded amount of data into memory or disk.
async function streamToFile(response: Response, filePath: string, maxBytes: number): Promise<number> {
  if (!response.body) {
    throw new Error('download response has no body');
  }
  const handle = await fs.open(filePath, 'w');
  let bytes = 0;
  try {
    const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
    for await (const chunk of nodeStream) {
      const buffer = chunk as Buffer;
      bytes += buffer.length;
      if (bytes > maxBytes) {
        nodeStream.destroy();
        throw new Error(`video exceeds byte cap of ${maxBytes} bytes`);
      }
      await handle.write(buffer);
    }
  } finally {
    await handle.close();
  }
  return bytes;
}

// Resolves a fresh mp4 URL for a TikTok video and downloads it to a temp file under
// LOCAL_FILES_PATH with an SSRF guard, a hard byte cap enforced on the actual stream, and a
// wall-clock timeout. Throws (after cleaning up any partial file) on oversized/unavailable/
// invalid input so the caller can fall back to a link-only delivery.
export async function downloadTikTokVideo(sourceUrl: string, opts: DownloadTikTokVideoOptions = {}): Promise<DownloadedVideo> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const destDir = opts.destDir ?? LOCAL_FILES_PATH;

  const downloadUrl = await getVideoDownloadUrl(sourceUrl);

  await fs.mkdir(destDir, { recursive: true });
  const filePath = path.join(destDir, `tiktok-${Date.now()}-${randomUUID()}.mp4`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchWithValidatedRedirects(downloadUrl, controller.signal, maxRedirects);

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new Error(`video Content-Length ${contentLength} exceeds byte cap of ${maxBytes} bytes`);
    }

    const bytes = await streamToFile(response, filePath, maxBytes);
    if (bytes < MIN_VIABLE_BYTES) {
      throw new Error(`download produced only ${bytes} bytes (< ${MIN_VIABLE_BYTES} min), treating as unavailable`);
    }
    return { path: filePath, bytes };
  } catch (err) {
    await fs.unlink(filePath).catch(() => undefined);
    logger.warn(`Failed to download TikTok video ${sourceUrl}: ${getErrorMessage(err)}`);
    throw err instanceof Error ? err : new Error(getErrorMessage(err));
  } finally {
    clearTimeout(timeout);
  }
}
