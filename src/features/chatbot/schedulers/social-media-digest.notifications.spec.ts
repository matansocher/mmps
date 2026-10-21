import { ObjectId } from 'mongodb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '@services/notifier';
import { sendShortenedMessage } from '@services/telegram';
import { claimDigestDelivery, deletePendingPosts, getPendingPostChatIds, getPendingPostsForChat, markDigestTextDelivered } from '@shared/social-follower';
import type { PendingPost } from '@shared/social-follower';
import { BOT_CONFIG, CHATBOT_CONFIG } from '../chatbot.config';
import type { ChatbotService } from '../chatbot.service';
import { socialMediaDigest } from './social-media-digest';
import { deliverDigestImages } from './social-media-image-delivery';

const admin = vi.hoisted(() => ({ userId: 123 }));
vi.mock('@core/config', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get MY_USER_ID() {
    return admin.userId;
  },
}));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: vi.fn(), TELEGRAM_MAX_MESSAGE_LENGTH: 4096 }));
vi.mock('@services/openai', () => ({ getResponse: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('@shared/social-follower', () => ({
  claimDigestDelivery: vi.fn(),
  deletePendingPosts: vi.fn(),
  getPendingPostBacklog: vi.fn().mockResolvedValue({ count: 1, oldestPostedAt: null }),
  getPendingPostChatIds: vi.fn(),
  getPendingPostsForChat: vi.fn(),
  markDigestTextDelivered: vi.fn(),
}));
vi.mock('./social-media-video-delivery', () => ({ deliverDigestVideos: vi.fn() }));
vi.mock('./social-media-image-delivery', () => ({ deliverDigestImages: vi.fn() }));

const bot = { api: {} } as Parameters<typeof socialMediaDigest>[0];
const chatbotService = { recordProactiveMessage: vi.fn() } as unknown as ChatbotService;
const mediaDefaults = { videos: CHATBOT_CONFIG.videoDigest.enabled, images: CHATBOT_CONFIG.imageDigest.enabled };

function post(chatId = 1): PendingPost {
  return {
    _id: new ObjectId(),
    platform: 'telegram',
    username: 'channel',
    chatId,
    postId: 'post',
    text: 'A short update',
    url: 'https://t.me/channel/1',
    postedAt: new Date(),
    collectedAt: new Date(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  admin.userId = 123;
  vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', 'configured');
  CHATBOT_CONFIG.videoDigest.enabled = false;
  CHATBOT_CONFIG.imageDigest.enabled = false;
  vi.mocked(getPendingPostChatIds).mockResolvedValue([1]);
  vi.mocked(getPendingPostsForChat).mockResolvedValue([post()]);
  vi.mocked(claimDigestDelivery).mockResolvedValue({ chatId: 1, digestDate: '2026-10-15', textDeliveredAt: null, videos: [], createdAt: new Date() });
  vi.mocked(sendShortenedMessage).mockResolvedValue(undefined as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  CHATBOT_CONFIG.videoDigest.enabled = mediaDefaults.videos;
  CHATBOT_CONFIG.imageDigest.enabled = mediaDefaults.images;
});

function summary(): string {
  expect(notify).toHaveBeenCalledTimes(1);
  expect(vi.mocked(notify).mock.calls[0][0]).toEqual(BOT_CONFIG);
  expect(vi.mocked(notify).mock.calls[0][1].action).toEqual('social_media_digest');
  return vi.mocked(notify).mock.calls[0][1].plainText!;
}

describe('socialMediaDigest() admin notification', () => {
  it.each([{ chatIds: [] }, { chatIds: [1] }])('reports empty distinctly when chats are $chatIds and no posts remain', async ({ chatIds }) => {
    vi.mocked(getPendingPostChatIds).mockResolvedValue(chatIds);
    vi.mocked(getPendingPostsForChat).mockResolvedValue([]);

    await expect(socialMediaDigest(bot, chatbotService)).resolves.toBeUndefined();

    expect(summary()).toEqual('Evening social media digest: Empty; no pending posts.');
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  it('sends one aggregate text success after processing every chat', async () => {
    vi.mocked(getPendingPostChatIds).mockResolvedValue([1, 2]);

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Text delivered: 2 chats complete; 0 incomplete.');
    expect(sendShortenedMessage).toHaveBeenCalledTimes(2);
    expect(markDigestTextDelivered).toHaveBeenCalledTimes(2);
    expect(deletePendingPosts).toHaveBeenCalledTimes(2);
  });

  it('counts swallowed send failures without aborting later chats or retrying the digest', async () => {
    vi.mocked(getPendingPostChatIds).mockResolvedValue([1, 2]);
    vi.mocked(sendShortenedMessage).mockRejectedValueOnce(new Error('markdown failed')).mockRejectedValueOnce(new Error('plain text failed'));

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Text incomplete: 1 chats complete; 1 incomplete.');
    expect(sendShortenedMessage).toHaveBeenCalledTimes(3);
    expect(markDigestTextDelivered).toHaveBeenCalledTimes(1);
    expect(deletePendingPosts).toHaveBeenCalledTimes(1);
  });

  it('reports partial chunk delivery as incomplete for the chat', async () => {
    vi.mocked(getPendingPostsForChat).mockResolvedValue(Array.from({ length: 30 }, (_, i) => ({ ...post(), username: `channel-${i}`, text: 'x'.repeat(250) })));
    vi.mocked(sendShortenedMessage)
      .mockResolvedValueOnce(undefined as never)
      .mockRejectedValue(new Error('send failed'));

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Text incomplete: 0 chats complete; 1 incomplete.');
    expect(vi.mocked(sendShortenedMessage).mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(markDigestTextDelivered).not.toHaveBeenCalled();
    expect(deletePendingPosts).toHaveBeenCalledTimes(1);
  });

  it('counts previously delivered text without sending a duplicate digest', async () => {
    vi.mocked(claimDigestDelivery).mockResolvedValue({ chatId: 1, digestDate: '2026-10-15', textDeliveredAt: new Date(), videos: [], createdAt: new Date() });

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Text delivered: 1 chats complete; 0 incomplete.');
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  it('preserves the existing plain-text fallback as a successful text delivery', async () => {
    vi.mocked(sendShortenedMessage).mockRejectedValueOnce(new Error('markdown failed'));

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Text delivered: 1 chats complete; 0 incomplete.');
    expect(sendShortenedMessage).toHaveBeenCalledTimes(2);
  });

  it('does not infer media success from a resolved delivery helper', async () => {
    CHATBOT_CONFIG.imageDigest.enabled = true;
    vi.mocked(deliverDigestImages).mockResolvedValue(undefined);

    await socialMediaDigest(bot, chatbotService);

    expect(summary()).toContain('Media delivery unverified.');
    expect(deliverDigestImages).toHaveBeenCalledTimes(1);
  });

  it('reports the original thrown error and still aborts without processing subsequent chats', async () => {
    const error = new Error('database unavailable');
    vi.mocked(getPendingPostChatIds).mockResolvedValue([1, 2]);
    vi.mocked(claimDigestDelivery).mockRejectedValue(error);

    await expect(socialMediaDigest(bot, chatbotService)).rejects.toBe(error);

    expect(summary()).toContain('Failed; run aborted.');
    expect(summary()).toContain('database unavailable');
    expect(getPendingPostsForChat).toHaveBeenCalledTimes(1);
    expect(sendShortenedMessage).not.toHaveBeenCalled();
  });

  it('notifies about a failure before any chats can be loaded', async () => {
    const error = new Error('cannot load chats');
    vi.mocked(getPendingPostChatIds).mockRejectedValue(error);

    await expect(socialMediaDigest(bot, chatbotService)).rejects.toBe(error);

    expect(summary()).toContain('Failed; run aborted.');
  });

  it.each([0, NaN, Infinity])('skips notifications when admin ID is %s', async (userId) => {
    admin.userId = userId;

    await socialMediaDigest(bot, chatbotService);

    expect(notify).not.toHaveBeenCalled();
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
  });

  it('skips notifications without a notifier token', async () => {
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', '');

    await socialMediaDigest(bot, chatbotService);

    expect(notify).not.toHaveBeenCalled();
    expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])('isolates notifier throws when digest itself fails: %s', async (fails) => {
    const error = new Error('original digest failure');
    vi.mocked(notify).mockImplementation(() => {
      throw new Error('notifier unavailable');
    });
    if (fails) {
      vi.mocked(getPendingPostChatIds).mockRejectedValue(error);
      await expect(socialMediaDigest(bot, chatbotService)).rejects.toBe(error);
    } else {
      await expect(socialMediaDigest(bot, chatbotService)).resolves.toBeUndefined();
      expect(sendShortenedMessage).toHaveBeenCalledTimes(1);
    }
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
