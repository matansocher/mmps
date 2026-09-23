import { GrammyError } from 'grammy';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendShortenedMessage } from '@services/telegram';
import { claimDigestImage, finalizeDigestImage, getDigestDelivery } from '@shared/social-follower';
import type { DigestDelivery, DigestImageEntry } from '@shared/social-follower';
import { buildImageCaption, deliverDigestImages } from './social-media-image-delivery';
import { MAX_CAPTION_LENGTH } from './social-media-video-delivery';

vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn() }));
vi.mock('@services/tiktok', () => ({ downloadTikTokVideo: vi.fn() }));
vi.mock('@shared/social-follower', () => ({ claimDigestImage: vi.fn(), finalizeDigestImage: vi.fn(), getDigestDelivery: vi.fn() }));
vi.mock('@core/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@core/utils')>()), sleep: vi.fn().mockResolvedValue(undefined) }));

const DIGEST_DATE = '2026-09-13';

function entry(overrides: Partial<DigestImageEntry> = {}): DigestImageEntry {
  return {
    entryId: 'e1',
    username: 'zivdev',
    displayName: 'Ziv',
    postId: '1',
    url: 'https://x.com/zivdev/status/1',
    text: 'look at this https://t.co/abc123',
    imageUrls: ['https://pbs.twimg.com/media/a.jpg', 'https://pbs.twimg.com/media/b.jpg'],
    state: 'pending',
    ...overrides,
  };
}

function record(images: DigestImageEntry[] | undefined): DigestDelivery {
  return { chatId: 1, digestDate: DIGEST_DATE, videos: [], images, textDeliveredAt: new Date(), createdAt: new Date() };
}

function makeBot() {
  return { api: { sendMediaGroup: vi.fn() } } as never as Parameters<typeof deliverDigestImages>[0] & { api: { sendMediaGroup: ReturnType<typeof vi.fn> } };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sendShortenedMessage).mockResolvedValue(undefined as never);
  vi.mocked(finalizeDigestImage).mockResolvedValue(undefined);
  vi.mocked(claimDigestImage).mockImplementation(async (_chatId, _date, entryId) => entry({ entryId, state: 'sending' }));
});

describe('buildImageCaption()', () => {
  it('includes creator, text and link, and drops the trailing media t.co link', () => {
    const caption = buildImageCaption(entry());
    expect(caption).toEqual('🐦 Ziv\nlook at this\nhttps://x.com/zivdev/status/1');
  });

  it('truncates long text but keeps the header and link within the cap', () => {
    const caption = buildImageCaption(entry({ text: 'x'.repeat(5000) }));
    expect(caption.length).toBeLessThanOrEqual(MAX_CAPTION_LENGTH);
    expect(caption).toContain('https://x.com/zivdev/status/1');
    expect(caption).toContain('…');
  });
});

describe('deliverDigestImages()', () => {
  it('does nothing for records without images (incl. records created before image support)', async () => {
    const bot = makeBot();
    vi.mocked(getDigestDelivery).mockResolvedValue(record(undefined));
    await deliverDigestImages(bot, 1, DIGEST_DATE);
    expect(bot.api.sendMediaGroup).not.toHaveBeenCalled();
  });

  it('sends one album per tweet with the caption on the first photo, then finalizes as sent', async () => {
    const bot = makeBot();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([entry()]));
    bot.api.sendMediaGroup.mockResolvedValue([]);

    await deliverDigestImages(bot, 1, DIGEST_DATE);

    const [chatId, media, options] = bot.api.sendMediaGroup.mock.calls[0];
    expect(chatId).toEqual(1);
    expect(media.map((m) => m.media)).toEqual(['https://pbs.twimg.com/media/a.jpg', 'https://pbs.twimg.com/media/b.jpg']);
    expect(media[0].caption).toContain('Ziv');
    expect(media[1].caption).toBeUndefined();
    expect(options).toEqual({ disable_notification: true });
    expect(finalizeDigestImage).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'sent');
  });

  it('skips entries that are not pending or were claimed by another run', async () => {
    const bot = makeBot();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([entry({ entryId: 'done', state: 'sent' }), entry({ entryId: 'taken' })]));
    vi.mocked(claimDigestImage).mockResolvedValue(null);

    await deliverDigestImages(bot, 1, DIGEST_DATE);

    expect(claimDigestImage).toHaveBeenCalledTimes(1);
    expect(bot.api.sendMediaGroup).not.toHaveBeenCalled();
  });

  it('retries once on a Telegram 429', async () => {
    const bot = makeBot();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([entry()]));
    const rateLimited = new GrammyError('Too Many Requests', { ok: false, error_code: 429, description: 'retry', parameters: { retry_after: 1 } }, 'sendMediaGroup', {});
    bot.api.sendMediaGroup.mockRejectedValueOnce(rateLimited).mockResolvedValueOnce([]);

    await deliverDigestImages(bot, 1, DIGEST_DATE);

    expect(bot.api.sendMediaGroup).toHaveBeenCalledTimes(2);
    expect(finalizeDigestImage).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'sent');
  });

  it('falls back to a link-only message when the album fails', async () => {
    const bot = makeBot();
    vi.mocked(getDigestDelivery).mockResolvedValue(record([entry()]));
    bot.api.sendMediaGroup.mockRejectedValue(new Error('wrong file identifier/HTTP URL specified'));

    await deliverDigestImages(bot, 1, DIGEST_DATE);

    expect(sendShortenedMessage).toHaveBeenCalledWith(bot, 1, expect.stringContaining('https://x.com/zivdev/status/1'));
    expect(finalizeDigestImage).toHaveBeenCalledWith(1, DIGEST_DATE, 'e1', 'link_only');
  });
});
