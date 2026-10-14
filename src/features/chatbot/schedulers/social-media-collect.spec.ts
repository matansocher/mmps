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
