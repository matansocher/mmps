import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PendingPost, SocialPlatform } from '@shared/social-follower';

const mocks = vi.hoisted(() => ({
  getPendingPostChatIds: vi.fn(),
  getPendingPostsForChat: vi.fn(),
  getPendingPostBacklog: vi.fn(),
  deletePendingPosts: vi.fn(),
  getResponse: vi.fn(),
  sendShortenedMessage: vi.fn(),
}));

vi.mock('@shared/social-follower', () => ({
  getPendingPostChatIds: mocks.getPendingPostChatIds,
  getPendingPostsForChat: mocks.getPendingPostsForChat,
  getPendingPostBacklog: mocks.getPendingPostBacklog,
  deletePendingPosts: mocks.deletePendingPosts,
}));
vi.mock('@services/openai', () => ({ getResponse: mocks.getResponse }));
vi.mock('@services/openai/constants', () => ({ GPT_SMALL_MODEL: 'gpt-small' }));
vi.mock('@services/telegram', () => ({ sendShortenedMessage: mocks.sendShortenedMessage, TELEGRAM_MAX_MESSAGE_LENGTH: 4095 }));

import { buildListingSection, chunkSections, groupPostsByUser, isLongPost, SECTION_BUDGET, socialMediaDigest, splitForAiBudget, targetKeyPointsCount } from './social-media-digest';
import type { DigestSection } from './social-media-digest';

function pendingPost(platform: SocialPlatform, username: string, postId: string, text: string | null = null): PendingPost {
  return {
    _id: { toString: () => postId } as unknown as PendingPost['_id'],
    platform,
    username,
    chatId: 1,
    postId,
    text,
    url: null,
    postedAt: new Date(),
    collectedAt: new Date(),
  };
}

function section(text: string, postCount: number): DigestSection {
  const posts = Array.from({ length: postCount }, (_, i) => pendingPost('twitter', 'user', `${text}-${i}`));
  return { text, posts };
}

describe('splitForAiBudget()', () => {
  test('should send all posts to AI when under the budget', () => {
    const posts = Array.from({ length: 3 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 5);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1', 'p-2']);
    expect(overflowPosts).toHaveLength(0);
  });

  test('should send exactly the budget to AI when at the boundary', () => {
    const posts = Array.from({ length: 5 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 5);
    expect(aiPosts).toHaveLength(5);
    expect(overflowPosts).toHaveLength(0);
  });

  test('should keep the newest posts for AI and overflow the older ones', () => {
    const posts = Array.from({ length: 7 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 3);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-4', 'p-5', 'p-6']);
    expect(overflowPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1', 'p-2', 'p-3']);
  });
});

describe('targetKeyPointsCount()', () => {
  test.each([
    { postsCount: 1, expected: 2 },
    { postsCount: 4, expected: 2 },
    { postsCount: 20, expected: 2 },
    { postsCount: 21, expected: 3 },
    { postsCount: 50, expected: 5 },
    { postsCount: 100, expected: 10 },
    { postsCount: 500, expected: 10 },
  ])('should return $expected when postsCount is $postsCount', ({ postsCount, expected }) => {
    expect(targetKeyPointsCount(postsCount)).toEqual(expected);
  });
});

describe('isLongPost()', () => {
  test.each([
    { label: 'null', text: null, expected: false },
    { label: 'empty', text: '', expected: false },
    { label: 'short text', text: 'a'.repeat(100), expected: false },
    { label: 'exactly at threshold (280)', text: 'a'.repeat(280), expected: false },
    { label: 'over threshold (281)', text: 'a'.repeat(281), expected: true },
  ])('should return $expected for $label', ({ text, expected }) => {
    expect(isLongPost(text)).toEqual(expected);
  });
});

describe('groupPostsByUser()', () => {
  test('should group accounts by platform while preserving account and post order', () => {
    const posts = [
      pendingPost('youtube', 'youtube-one', 'youtube-1'),
      pendingPost('telegram', 'telegram-one', 'telegram-1'),
      pendingPost('twitter', 'twitter-one', 'twitter-1'),
      pendingPost('telegram', 'telegram-two', 'telegram-2'),
      pendingPost('youtube', 'youtube-one', 'youtube-2'),
      pendingPost('tiktok', 'tiktok-one', 'tiktok-1'),
      pendingPost('telegram', 'telegram-one', 'telegram-3'),
    ];

    const groupedPosts = groupPostsByUser(posts);

    expect(groupedPosts.map((userPosts) => `${userPosts[0].platform}:${userPosts[0].username}`)).toEqual([
      'telegram:telegram-one',
      'telegram:telegram-two',
      'twitter:twitter-one',
      'youtube:youtube-one',
      'tiktok:tiktok-one',
    ]);
    expect(groupedPosts[0].map((post) => post.postId)).toEqual(['telegram-1', 'telegram-3']);
    expect(groupedPosts[3].map((post) => post.postId)).toEqual(['youtube-1', 'youtube-2']);
  });
});

describe('chunkSections()', () => {
  test('should return no chunks when there are no sections', () => {
    expect(chunkSections([])).toEqual([]);
  });

  test('should pack all short sections into a single titled chunk', () => {
    const chunks = chunkSections([section('a', 1), section('b', 2), section('c', 3)]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.startsWith('*Daily social media digest* 🔔\n\n')).toBe(true);
    expect(chunks[0].text).toContain('a');
    expect(chunks[0].text).toContain('b');
    expect(chunks[0].text).toContain('c');
    expect(chunks[0].posts).toHaveLength(6);
  });

  test('should split into multiple chunks at section boundaries when over the length cap', () => {
    const big = 'x'.repeat(3000);
    const chunks = chunkSections([section(big, 1), section(big, 1)]);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].text.startsWith('*Daily social media digest* 🔔\n\n')).toBe(true);
    expect(chunks[1].text.startsWith('*Daily social media digest* 🔔')).toBe(false);
    expect(chunks[0].posts).toHaveLength(1);
    expect(chunks[1].posts).toHaveLength(1);
  });

  test('should keep every post across all chunks so nothing is dropped', () => {
    const big = 'y'.repeat(2500);
    const sections = [section(big, 4), section(big, 5), section(big, 6)];

    const chunks = chunkSections(sections);
    const totalPosts = chunks.reduce((sum, chunk) => sum + chunk.posts.length, 0);

    expect(totalPosts).toEqual(15);
  });

  test('should only put the title on the first chunk', () => {
    const big = 'z'.repeat(3000);
    const chunks = chunkSections([section(big, 1), section(big, 1), section(big, 1)]);

    const titledChunks = chunks.filter((chunk) => chunk.text.includes('*Daily social media digest* 🔔'));
    expect(titledChunks).toHaveLength(1);
    expect(chunks[0]).toBe(titledChunks[0]);
  });

  test('should keep the titled first chunk within the send cap when a section fills the whole budget', () => {
    // A section sized to the full per-section budget must still fit once the title is prepended,
    // otherwise sendShortenedMessage would truncate it and delete posts it never rendered.
    const chunks = chunkSections([section('w'.repeat(SECTION_BUDGET), 3)]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(4095);
    expect(chunks[0].posts).toHaveLength(3);
  });
});

describe('buildListingSection()', () => {
  test('should represent exactly the posts it renders and retain the older overflow', () => {
    const posts = Array.from({ length: 20 }, (_, i) => pendingPost('youtube', 'user', `p-${i}`, `text ${i}`));

    const sections = buildListingSection(posts, 15);
    const rendered = sections.flatMap((s) => s.posts.map((p) => p.postId));

    // Only the newest 15 are rendered/acknowledged; the older 5 are retained (not listed, not
    // acknowledged) so they roll into the next digest instead of being deleted behind a note.
    expect(rendered).toEqual(['p-5', 'p-6', 'p-7', 'p-8', 'p-9', 'p-10', 'p-11', 'p-12', 'p-13', 'p-14', 'p-15', 'p-16', 'p-17', 'p-18', 'p-19']);
    expect(sections.every((s) => !s.text.includes('more'))).toBe(true);
  });

  test('should return no sections when there are no posts to render', () => {
    expect(buildListingSection([])).toEqual([]);
  });

  test('should split a 41-post overflow into budget-fitting sections that keep every post exactly once', () => {
    // 41 tiny posts fit in one message, but this asserts the packing keeps them all and the
    // section text is aligned to the posts it carries.
    const posts = Array.from({ length: 41 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, `t${i}`));

    const sections = buildListingSection(posts);
    const rendered = sections.flatMap((s) => s.posts.map((p) => p.postId));

    expect(rendered).toEqual(posts.map((p) => p.postId));
    expect(sections.every((s) => s.text.length <= SECTION_BUDGET)).toBe(true);
  });

  test('should split an oversized account across multiple sections without dropping a post', () => {
    // Each post is ~300 chars, so far more than one message can hold: the account must span
    // several sections and every post must appear in exactly one of them.
    const posts = Array.from({ length: 30 }, (_, i) => pendingPost('youtube', 'user', `p-${i}`, `${'a'.repeat(300)}-${i}`));

    const sections = buildListingSection(posts);
    const rendered = sections.flatMap((s) => s.posts.map((p) => p.postId));

    expect(sections.length).toBeGreaterThan(1);
    expect(sections.every((s) => s.text.length <= SECTION_BUDGET)).toBe(true);
    expect(new Set(rendered).size).toEqual(30);
    expect(rendered.sort()).toEqual(posts.map((p) => p.postId).sort());
  });

  test('should keep a single monster post within budget and still represent it', () => {
    const posts = [pendingPost('youtube', 'user', 'huge', 'q'.repeat(SECTION_BUDGET * 2))];

    const sections = buildListingSection(posts);

    expect(sections).toHaveLength(1);
    expect(sections[0].text.length).toBeLessThanOrEqual(SECTION_BUDGET);
    expect(sections[0].posts.map((p) => p.postId)).toEqual(['huge']);
  });
});

describe('socialMediaDigest() send/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPendingPostChatIds.mockResolvedValue([1]);
    mocks.getPendingPostBacklog.mockResolvedValue({ count: 0, oldestPostedAt: null });
    mocks.sendShortenedMessage.mockResolvedValue({});
  });

  const bot = {} as never;

  const deletedIds = () => mocks.deletePendingPosts.mock.calls.flatMap((call) => (call[0] as { toString: () => string }[]).map((id) => id.toString()));

  test('should delete only the posts it rendered and retain the fallback-omitted overflow', async () => {
    // 20 non-summarized posts, AI never involved: only the newest posts are rendered when a
    // section is capped, and the older omitted ones must survive rather than be deleted.
    const posts = Array.from({ length: 20 }, (_, i) => pendingPost('youtube', 'user', `p-${i}`, `t${i}`));
    mocks.getPendingPostsForChat.mockResolvedValue(posts);

    await socialMediaDigest(bot);

    // youtube posts are listed (no AI), all fit in one message, so all are delivered + deleted.
    expect(deletedIds().sort()).toEqual(posts.map((p) => p.postId).sort());
    expect(mocks.getResponse).not.toHaveBeenCalled();
  });

  test('should not delete anything when the send fails', async () => {
    const posts = Array.from({ length: 3 }, (_, i) => pendingPost('youtube', 'user', `p-${i}`, `t${i}`));
    mocks.getPendingPostsForChat.mockResolvedValue(posts);
    mocks.sendShortenedMessage.mockRejectedValue(new Error('telegram down'));

    await socialMediaDigest(bot);

    expect(mocks.deletePendingPosts).not.toHaveBeenCalled();
  });

  test('should keep the AI-overflow posts out of what gets deleted when summarization drops them', async () => {
    // 45 twitter posts exceed the 40-post AI budget by 5. The summary represents the newest 40;
    // the 5 overflow are rendered as their own listing section, so every post is delivered and
    // acknowledged, and none is deleted without being represented.
    const posts = Array.from({ length: 45 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, `t${i}`));
    mocks.getPendingPostsForChat.mockResolvedValue(posts);
    mocks.getResponse.mockResolvedValue({ result: { keyPoints: ['a', 'b', 'c'] } });

    await socialMediaDigest(bot);

    const sentText = mocks.sendShortenedMessage.mock.calls.map((call) => call[2] as string).join('\n');
    // the 5 overflow posts (p-0..p-4) must actually appear in a delivered message, not vanish
    // behind a count-only note before deletion.
    expect(sentText).toContain('t0');
    expect(sentText).toContain('t4');
    expect(deletedIds().sort()).toEqual(posts.map((p) => p.postId).sort());
    // one AI call for the 40-post summary window only
    expect(mocks.getResponse).toHaveBeenCalledTimes(1);
  });
});
