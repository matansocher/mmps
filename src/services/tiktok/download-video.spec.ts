import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getVideoDownloadUrl } from './api';
import { downloadTikTokVideo, isPrivateIp } from './download-video';

vi.mock('./api', () => ({ getVideoDownloadUrl: vi.fn() }));
vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));

const SOURCE = 'https://www.tiktok.com/@u/video/123';
const DOWNLOAD_URL = 'https://cdn.example.com/video.mp4';

function webStreamFrom(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

function okResponse(chunks: Uint8Array[], headers: Record<string, string> = {}): Response {
  return new Response(webStreamFrom(chunks), { status: 200, headers });
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

let destDir: string;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.mocked(getVideoDownloadUrl).mockResolvedValue(DOWNLOAD_URL);
  vi.mocked(lookup).mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
  destDir = path.join('./assets/downloads', `test-${randomUUID()}`);
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(destDir, { recursive: true, force: true });
});

async function remainingFiles(): Promise<string[]> {
  return fs.readdir(destDir).catch(() => []);
}

describe('isPrivateIp()', () => {
  it.each([
    { ip: '10.0.0.1', expected: true },
    { ip: '127.0.0.1', expected: true },
    { ip: '169.254.1.1', expected: true },
    { ip: '172.16.5.4', expected: true },
    { ip: '172.31.255.255', expected: true },
    { ip: '192.168.1.1', expected: true },
    { ip: '0.0.0.0', expected: true },
    { ip: '::1', expected: true },
    { ip: 'fc00::1', expected: true },
    { ip: 'fe80::1', expected: true },
    { ip: '::ffff:127.0.0.1', expected: true },
    { ip: '8.8.8.8', expected: false },
    { ip: '93.184.216.34', expected: false },
    { ip: '172.32.0.1', expected: false },
    { ip: '2606:2800:220:1::1', expected: false },
  ])('returns $expected for $ip', ({ ip, expected }) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });
});

describe('downloadTikTokVideo()', () => {
  it('downloads to a temp file on the success path and reports the byte size', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([new Uint8Array(2048)]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await downloadTikTokVideo(SOURCE, { destDir });

    expect(result.bytes).toBe(2048);
    const stat = await fs.stat(result.path);
    expect(stat.size).toBe(2048);
    await fs.unlink(result.path);
  });

  it('throws and cleans up when the download yields an empty (0-byte) body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir })).rejects.toThrow(/0 bytes/);
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('aborts and cleans up when the stream exceeds the byte cap with a missing Content-Length', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([new Uint8Array(10), new Uint8Array(10)]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir, maxBytes: 15 })).rejects.toThrow(/byte cap/);
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('aborts when the stream exceeds the byte cap even though Content-Length lies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse([new Uint8Array(50)], { 'content-length': '5' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir, maxBytes: 20 })).rejects.toThrow(/byte cap/);
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('fails fast when Content-Length already exceeds the cap', async () => {
    const bodyStart = vi.fn();
    const stream = new ReadableStream<Uint8Array>({ start: bodyStart });
    const fetchMock = vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { 'content-length': '999' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir, maxBytes: 100 })).rejects.toThrow(/Content-Length/);
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('follows a redirect and validates the redirected host', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse('https://cdn2.example.com/v.mp4'))
      .mockResolvedValueOnce(okResponse([new Uint8Array(2048)]));
    vi.stubGlobal('fetch', fetchMock);

    const result = await downloadTikTokVideo(SOURCE, { destDir });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.bytes).toBe(2048);
    await fs.unlink(result.path);
  });

  it('rejects a redirect that resolves to a private IP', async () => {
    vi.mocked(lookup)
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }] as never)
      .mockResolvedValueOnce([{ address: '169.254.1.1', family: 4 }] as never);
    const fetchMock = vi.fn().mockResolvedValueOnce(redirectResponse('https://internal.example.com/v.mp4'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir })).rejects.toThrow(/blocked address/);
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('rejects when the download URL resolves to a private IP before any fetch', async () => {
    vi.mocked(lookup).mockResolvedValue([{ address: '10.1.2.3', family: 4 }] as never);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir })).rejects.toThrow(/blocked address/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aborts on the wall-clock timeout and leaves no temp file', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init?: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir, timeoutMs: 20 })).rejects.toThrow();
    expect(await remainingFiles()).toHaveLength(0);
  });

  it('rejects an unsupported URL scheme', async () => {
    vi.mocked(getVideoDownloadUrl).mockResolvedValue('ftp://cdn.example.com/v.mp4');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(downloadTikTokVideo(SOURCE, { destDir })).rejects.toThrow(/scheme/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
