import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendShortenedMessage } from '@services/telegram';
import { claimDigestDelivery, deletePendingPosts, markDigestTextDelivered } from '@shared/social-follower';
import type { DigestDelivery, PendingPost } from '@shared/social-follower';
import { processDigestForChat } from './social-media-digest';
import { deliverDigestVideos } from './social-media-video-delivery';

vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn(), TELEGRAM_MAX_MESSAGE_LENGTH: 4096 }));
vi.mock('@shared/social-follower', () => ({ claimDigestDelivery: vi.fn(), deletePendingPosts: vi.fn(), markDigestTextDelivered: vi.fn() }));
vi.mock('./social-media-video-delivery', () => ({ deliverDigestVideos: vi.fn() }));

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

describe('processDigestForChat()', () => {
  it('delivers the text digest then the videos, and marks text delivered', async () => {
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
    vi.mocked(claimDigestDelivery).mockResolvedValue(claimedRecord({ textDeliveredAt: new Date() }));

    await processDigestForChat(bot, CHAT_ID, [tiktokPost('a')], DIGEST_DATE);

    expect(sendShortenedMessage).not.toHaveBeenCalled(); // no text resend
    expect(markDigestTextDelivered).not.toHaveBeenCalled();
    expect(deliverDigestVideos).toHaveBeenCalledTimes(1); // idempotent claim inside skips already-sent videos
  });
});
