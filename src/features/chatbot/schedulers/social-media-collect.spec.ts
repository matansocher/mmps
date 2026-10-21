import { notify } from '@services/notifier';
import { getVideosFromRSS } from '@services/youtube';
import type { SocialSubscription } from '@shared/social-follower';
import { socialMediaCollect } from './social-media-collect';

const { getUserSecUid, getUserVideosBySecUid, getSubscriptionsGroupedByChatId, createPendingPosts, updateLastSeen, updateSecUid } = vi.hoisted(() => ({
  getUserSecUid: vi.fn(),
  getUserVideosBySecUid: vi.fn(),
  getSubscriptionsGroupedByChatId: vi.fn(),
  createPendingPosts: vi.fn(),
  updateLastSeen: vi.fn(),
  updateSecUid: vi.fn(),
}));

vi.mock('@core/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@core/utils')>()), sleep: vi.fn() }));
vi.mock('@core/config', () => ({ MY_USER_ID: 42, isProd: false }));
vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('@services/tiktok', () => ({ getUserSecUid, getUserVideosBySecUid }));
vi.mock('@services/telegram-scraper', () => ({ fetchChannelPosts: vi.fn() }));
vi.mock('@services/twitter-scraper', () => ({ fetchLatestPosts: vi.fn() }));
vi.mock('@services/youtube', () => ({ getVideosFromRSS: vi.fn() }));
vi.mock('@shared/social-follower', () => ({ getSubscriptionsGroupedByChatId, createPendingPosts, updateLastSeen, updateSecUid }));

const CHAT_ID = 123;

function givenTikTokSubscription(overrides: Partial<SocialSubscription> = {}): void {
  const subscription = { platform: 'tiktok', username: 'creator', displayName: 'Creator', chatId: CHAT_ID, lastSeenId: null, ...overrides } as SocialSubscription;
  getSubscriptionsGroupedByChatId.mockResolvedValue(new Map([[CHAT_ID, [subscription]]]));
}

describe('socialMediaCollect() tiktok secUid caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserVideosBySecUid.mockResolvedValue({ videos: [] });
  });

  it('should use the cached secUid without re-resolving it', async () => {
    givenTikTokSubscription({ secUid: 'cached-sec-uid' });

    await socialMediaCollect(['tiktok']);

    expect(getUserSecUid).not.toHaveBeenCalled();
    expect(updateSecUid).not.toHaveBeenCalled();
    expect(getUserVideosBySecUid).toHaveBeenCalledWith('cached-sec-uid', 5);
  });

  it('should resolve and cache the secUid when it is missing', async () => {
    givenTikTokSubscription({ secUid: null });
    getUserSecUid.mockResolvedValue('fresh-sec-uid');

    await socialMediaCollect(['tiktok']);

    expect(getUserSecUid).toHaveBeenCalledTimes(1);
    expect(updateSecUid).toHaveBeenCalledWith('creator', CHAT_ID, 'fresh-sec-uid');
    expect(getUserVideosBySecUid).toHaveBeenCalledWith('fresh-sec-uid', 5);
  });
});

describe('direct YouTube collection notifications', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', 'configured');
  });
  afterEach(() => vi.unstubAllEnvs());
  it('reports no subscriptions rather than a misleading collection count', async () => {
    getSubscriptionsGroupedByChatId.mockResolvedValue(new Map());
    await socialMediaCollect(['youtube']);
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('no subscriptions');
  });
  it('reports no new videos separately from swallowed subscription failures', async () => {
    const sub = { platform: 'youtube', username: 'channel', chatId: 42 };
    getSubscriptionsGroupedByChatId.mockResolvedValue(new Map([[42, [sub, sub]]]));
    vi.mocked(getVideosFromRSS).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('RSS failed'));
    await socialMediaCollect(['youtube']);
    expect(notify).toHaveBeenCalledOnce();
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('partial failure');
    expect(vi.mocked(notify).mock.calls[0][1].plainText).toContain('1 failed, 0 new videos');
  });
  it('preserves business errors and contains notifier failures', async () => {
    getSubscriptionsGroupedByChatId.mockRejectedValue(new Error('lookup failed'));
    vi.mocked(notify).mockImplementation(() => {
      throw new Error('notifier down');
    });
    await expect(socialMediaCollect(['youtube'])).rejects.toThrow('lookup failed');
  });
  it('does not notify without existing credentials or for unrelated collectors', async () => {
    getSubscriptionsGroupedByChatId.mockResolvedValue(new Map());
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', '');
    await socialMediaCollect(['youtube']);
    vi.stubEnv('NOTIFIER_TELEGRAM_BOT_TOKEN', 'configured');
    await socialMediaCollect(['twitter']);
    expect(notify).not.toHaveBeenCalled();
  });
});
