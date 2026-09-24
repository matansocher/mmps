import { ObjectId } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendShortenedMessage } from '@services/telegram';
import { claimDigestDelivery, deletePendingPosts, markDigestTextDelivered } from '@shared/social-follower';
import type { DigestDelivery, PendingPost } from '@shared/social-follower';
import { CHATBOT_CONFIG } from '../chatbot.config';
import { processDigestForChat, selectTwitterImagePendingPosts } from './social-media-digest';
import { deliverDigestImages } from './social-media-image-delivery';
import { deliverDigestVideos } from './social-media-video-delivery';

vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn(), TELEGRAM_MAX_MESSAGE_LENGTH: 4096 }));
vi.mock('@services/openai', () => ({ getResponse: vi.fn().mockRejectedValue(new Error('offline')) })); // tweets fall back to the raw listing
vi.mock('@shared/social-follower', () => ({ claimDigestDelivery: vi.fn(), deletePendingPosts: vi.fn(), markDigestTextDelivered: vi.fn() }));
vi.mock('./social-media-video-delivery', () => ({ deliverDigestVideos: vi.fn() }));
vi.mock('./social-media-image-delivery', () => ({ deliverDigestImages: vi.fn() }));

const CHAT_ID = 1;
const DIGEST_DATE = '2026-09-13';

function tiktokPost(postId: string): PendingPost {
  return {
    _id: new ObjectId(),
    platform: 'tiktok',
    username: 'creator',
    displayName: 'Creator',
    chatId: CHAT_ID,
    postId,
    text: 'clip',
    url: `https://tiktok.com/${postId}`,
    postedAt: new Date(),
    collectedAt: new Date(),
  };
}

function tweetPost(postId: string, imageUrls?: string[]): PendingPost {
  return { ...tiktokPost(postId), platform: 'twitter', text: 'a tweet', url: `https://x.com/creator/status/${postId}`, imageUrls };
}

function claimedRecord(overrides: Partial<DigestDelivery> = {}): DigestDelivery {
  return { chatId: CHAT_ID, digestDate: '2026-09-13', videos: [], textDeliveredAt: null, createdAt: new Date(), ...overrides };
}

const bot = { api: {} } as never as Parameters<typeof processDigestForChat>[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(claimDigestDelivery).mockResolvedValue(claimedRecord());
  vi.mocked(markDigestTextDelivered).mockResolvedValue(undefined);
  vi.mocked(deletePendingPosts).mockResolvedValue(undefined as never);
  vi.mocked(sendShortenedMessage).mockResolvedValue(undefined as never);
  vi.mocked(deliverDigestVideos).mockResolvedValue(undefined);
});

const videoDigestDefault = CHATBOT_CONFIG.videoDigest.enabled;
afterEach(() => {
  CHATBOT_CONFIG.videoDigest.enabled = videoDigestDefault;
});

describe('processDigestForChat()', () => {
  it('by default sends only the text digest, without selecting or delivering videos', async () => {
    expect(videoDigestDefault).toEqual(false);

    await processDigestForChat(bot, CHAT_ID, [tiktokPost('a')], DIGEST_DATE);

    expect(sendShortenedMessage).toHaveBeenCalled();
    expect(markDigestTextDelivered).toHaveBeenCalledTimes(1);
    expect(vi.mocked(claimDigestDelivery).mock.calls[0][0].videos).toEqual([]);
    expect(deliverDigestVideos).not.toHaveBeenCalled();
  });

  it('delivers the text digest then the videos, and marks text delivered', async () => {
    CHATBOT_CONFIG.videoDigest.enabled = true;

    await processDigestForChat(bot, CHAT_ID, [tiktokPost('a')], DIGEST_DATE);

    expect(sendShortenedMessage).toHaveBeenCalled();
    expect(markDigestTextDelivered).toHaveBeenCalledTimes(1);
    expect(deliverDigestVideos).toHaveBeenCalledTimes(1);
  });

  it('on a total text-delivery failure does NOT attach videos and retains the posts', async () => {
    vi.mocked(sendShortenedMessage).mockRejectedValue(new Error('telegram down'));

    await processDigestForChat(bot, CHAT_ID, [tiktokPost('a')], DIGEST_DATE);

    expect(markDigestTextDelivered).not.toHaveBeenCalled();
    expect(deletePendingPosts).not.toHaveBeenCalled(); // posts kept for next digest
    expect(deliverDigestVideos).not.toHaveBeenCalled();
  });

  it('on restart (text already delivered) does not resend text but still runs video delivery', async () => {
    CHATBOT_CONFIG.videoDigest.enabled = true;
    vi.mocked(claimDigestDelivery).mockResolvedValue(claimedRecord({ textDeliveredAt: new Date() }));

    await processDigestForChat(bot, CHAT_ID, [tiktokPost('a')], DIGEST_DATE);

    expect(sendShortenedMessage).not.toHaveBeenCalled(); // no text resend
    expect(markDigestTextDelivered).not.toHaveBeenCalled();
    expect(deliverDigestVideos).toHaveBeenCalledTimes(1); // idempotent claim inside skips already-sent videos
  });

  it('snapshots tweets with photos into the delivery record and delivers images after the text', async () => {
    await processDigestForChat(bot, CHAT_ID, [tweetPost('t1', ['https://pbs.twimg.com/media/a.jpg']), tweetPost('t2')], DIGEST_DATE);

    const [{ images }] = vi.mocked(claimDigestDelivery).mock.calls[0];
    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ postId: 't1', imageUrls: ['https://pbs.twimg.com/media/a.jpg'], state: 'pending' });
    expect(deliverDigestImages).toHaveBeenCalledTimes(1);
  });

  it('does not deliver images when the text digest failed entirely', async () => {
    vi.mocked(sendShortenedMessage).mockRejectedValue(new Error('telegram down'));

    await processDigestForChat(bot, CHAT_ID, [tweetPost('t1', ['https://pbs.twimg.com/media/a.jpg'])], DIGEST_DATE);

    expect(deliverDigestImages).not.toHaveBeenCalled();
  });
});

describe('selectTwitterImagePendingPosts()', () => {
  it('keeps only tweets with photos, newest first, capped', () => {
    const older = { ...tweetPost('old', ['https://pbs.twimg.com/media/o.jpg']), postedAt: new Date('2026-09-01') };
    const newer = { ...tweetPost('new', ['https://pbs.twimg.com/media/n.jpg']), postedAt: new Date('2026-09-02') };
    const selected = selectTwitterImagePendingPosts([older, tweetPost('text-only'), tiktokPost('clip'), newer], 1);
    expect(selected.map((post) => post.postId)).toEqual(['new']);
  });

  it('returns nothing when max is 0', () => {
    expect(selectTwitterImagePendingPosts([tweetPost('t', ['https://pbs.twimg.com/media/a.jpg'])], 0)).toEqual([]);
  });
});
