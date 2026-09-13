import { GrammyError } from 'grammy';
import { promises as fs } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendShortenedMessage } from '@services/telegram';
import { downloadTikTokVideo } from '@services/tiktok';
import { claimDigestVideo, finalizeDigestVideo, getDigestDelivery } from '@shared/social-follower';
import type { DigestDelivery, DigestVideoEntry } from '@shared/social-follower';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { buildVideoCaption, deliverDigestVideos, MAX_CAPTION_LENGTH } from './social-media-video-delivery';

vi.mock('@services/tiktok', () => ({ downloadTikTokVideo: vi.fn() }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn() }));
vi.mock('@shared/social-follower', () => ({ claimDigestVideo: vi.fn(), finalizeDigestVideo: vi.fn(), getDigestDelivery: vi.fn() }));
vi.mock('node:fs', () => ({ promises: { unlink: vi.fn().mockResolvedValue(undefined) } }));

const DIGEST_DATE = '2026-09-13';

function entry(overrides: Partial<DigestVideoEntry> = {}): DigestVideoEntry {
  return { entryId: 'e1', username: 'creator', displayName: 'The Creator', postId: 'p1', url: 'https://tiktok.com/@creator/video/1', text: 'a funny clip', state: 'pending', ...overrides };
}

function record(videos: DigestVideoEntry[]): DigestDelivery {
  return { chatId: 1, digestDate: DIGEST_DATE, videos, textDeliveredAt: new Date(), createdAt: new Date() };
}

function makeBot() {
  return { api: { sendVideo: vi.fn() } } as never as Parameters<typeof deliverDigestVideos>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendShortenedMessage).mockResolvedValue(undefined as never);
  vi.mocked(finalizeDigestVideo).mockResolvedValue(undefined);
  vi.mocked(fs.unlink).mockResolvedValue(undefined);
});

describe('buildVideoCaption()', () => {
  it('includes creator, text and the source link', () => {
    const caption = buildVideoCaption(entry());
    expect(caption).toContain('The Creator');
    expect(caption).toContain('a funny clip');
    expect(caption).toContain('https://tiktok.com/@creator/video/1');
  });

  it('falls back to @username when there is no display name', () => {
    expect(buildVideoCaption(entry({ displayName: null }))).toContain('@creator');
  });

  it('truncates the post text but always keeps the header and link within the cap', () => {
    const caption = buildVideoCaption(entry({ text: 'x'.repeat(5000) }));
    expect(caption.length).toBeLessThanOrEqual(MAX_CAPTION_LENGTH);
    expect(caption).toContain('https://tiktok.com/@creator/video/1');
    expect(caption).toContain('…');
  });
});

describe('deliverDigestVideos()', () => {
  it('does nothing when there is no record or no videos', async () => {
    vi.mocked(getDigestDelivery).mockResolvedValue(null);
    await deliverDigestVideos(makeBot(), 1, DIGEST_DATE);
    expect(claimDigestVideo).not.toHaveBeenCalled();
  });

  it('sends a claimed video and finalizes it as sent with the message id', async () => {
    const e = entry();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
    vi.mocked(claimDigestVideo).mockResolvedValue(e);
    vi.mocked(downloadTikTokVideo).mockResolvedValue({ path: '/x/v.mp4', bytes: 100 });
    const bot = makeBot();
    vi.mocked(bot.api.sendVideo).mockResolvedValue({ message_id: 555 } as never);

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(bot.api.sendVideo).toHaveBeenCalledTimes(1);
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'sent', 555);
    expect(sendShortenedMessage).not.toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalledWith('/x/v.mp4');
  });

  it('falls back to a link-only message when the download fails', async () => {
    const e = entry();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
    vi.mocked(claimDigestVideo).mockResolvedValue(e);
    vi.mocked(downloadTikTokVideo).mockRejectedValue(new Error('oversized'));
    const bot = makeBot();

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(bot.api.sendVideo).not.toHaveBeenCalled();
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'link_only');
  });

  it('on an ambiguous send timeout does NOT re-upload and falls back to link-only', async () => {
    const e = entry();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
    vi.mocked(claimDigestVideo).mockResolvedValue(e);
    vi.mocked(downloadTikTokVideo).mockResolvedValue({ path: '/x/v.mp4', bytes: 100 });
    const bot = makeBot();
    vi.mocked(bot.api.sendVideo).mockRejectedValue(new Error('network timeout'));

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(bot.api.sendVideo).toHaveBeenCalledTimes(1); // never retried
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'link_only');
  });

  it('skips entries that are not pending and those already claimed by another run', async () => {
    const pending = entry({ entryId: 'p' });
    const alreadySent = entry({ entryId: 's', state: 'sent' });
    vi.mocked(getDigestDelivery).mockResolvedValue(record([alreadySent, pending]));
    vi.mocked(claimDigestVideo).mockResolvedValue(null); // lost the race
    const bot = makeBot();

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(claimDigestVideo).toHaveBeenCalledTimes(1);
    expect(claimDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'p');
    expect(bot.api.sendVideo).not.toHaveBeenCalled();
  });

  it('isolates failures: one video failing does not stop the others', async () => {
    const a = entry({ entryId: 'a', url: 'https://tiktok.com/a' });
    const b = entry({ entryId: 'b', url: 'https://tiktok.com/b' });
    vi.mocked(getDigestDelivery).mockResolvedValue(record([a, b]));
    vi.mocked(claimDigestVideo).mockImplementation(async (_c, _d, id) => (id === 'a' ? a : b));
    vi.mocked(downloadTikTokVideo).mockResolvedValueOnce({ path: '/x/a.mp4', bytes: 1 }).mockResolvedValueOnce({ path: '/x/b.mp4', bytes: 1 });
    const bot = makeBot();
    vi.mocked(bot.api.sendVideo)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ message_id: 9 } as never);

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'a', 'link_only');
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'b', 'sent', 9);
  });

  it('retries a rate-limited send within budget then finalizes as sent', async () => {
    const e = entry();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
    vi.mocked(claimDigestVideo).mockResolvedValue(e);
    vi.mocked(downloadTikTokVideo).mockResolvedValue({ path: '/x/v.mp4', bytes: 100 });
    const bot = makeBot();
    const rateLimit = new GrammyError('Too Many Requests', { ok: false, error_code: 429, description: 'retry', parameters: { retry_after: 0 } } as never, 'sendVideo', {});
    vi.mocked(bot.api.sendVideo)
      .mockRejectedValueOnce(rateLimit)
      .mockResolvedValueOnce({ message_id: 77 } as never);

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(bot.api.sendVideo).toHaveBeenCalledTimes(2);
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'sent', 77);
  });

  it('stops retrying and falls back to link-only once the overall per-video budget is exhausted after the first attempt', async () => {
    vi.useFakeTimers();
    try {
      const e = entry();
      vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
      vi.mocked(claimDigestVideo).mockResolvedValue(e);
      // The first (download) attempt consumes the whole per-video budget then fails; the deadline
      // gate at the top of the loop then blocks any further attempt.
      vi.mocked(downloadTikTokVideo).mockImplementation(async () => {
        vi.advanceTimersByTime(CHATBOT_CONFIG.videoDigest.totalBudgetMs + 1);
        throw new Error('slow download');
      });
      const bot = makeBot();

      await deliverDigestVideos(bot, 1, DIGEST_DATE);

      expect(downloadTikTokVideo).toHaveBeenCalledTimes(1); // no second attempt
      expect(bot.api.sendVideo).not.toHaveBeenCalled();
      expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
      expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'link_only');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not sleep-and-retry when a 429 retry_after exceeds the remaining budget; falls back to link-only', async () => {
    const e = entry();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([e]));
    vi.mocked(claimDigestVideo).mockResolvedValue(e);
    vi.mocked(downloadTikTokVideo).mockResolvedValue({ path: '/x/v.mp4', bytes: 100 });
    const bot = makeBot();
    // retry_after far larger than the total per-video budget → waiting would blow the deadline.
    const rateLimit = new GrammyError('Too Many Requests', { ok: false, error_code: 429, description: 'retry', parameters: { retry_after: 99999 } } as never, 'sendVideo', {});
    vi.mocked(bot.api.sendVideo).mockRejectedValue(rateLimit);

    await deliverDigestVideos(bot, 1, DIGEST_DATE);

    expect(bot.api.sendVideo).toHaveBeenCalledTimes(1); // never re-sent
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
    expect(finalizeDigestVideo).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'link_only');
  });
});
