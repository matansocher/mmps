import { describe, expect, test } from 'vitest';
import type { PendingPost, SocialPlatform } from '@shared/social-follower';
import { chunkSections, groupPostsByUser, isLongPost, MAX_AI_CHARS_PER_POST, MAX_AI_INPUT_CHARS, splitForAiBudget, targetKeyPointsCount } from './social-media-digest';
import type { DigestSection } from './social-media-digest';

function pendingPost(platform: SocialPlatform, username: string, postId: string, text: string | null = null): PendingPost {
  return {
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

  test('should overflow older posts once the newest ones exhaust the text budget', () => {
    // Each post is 40 chars; a 100-char budget fits only the two newest.
    const posts = Array.from({ length: 4 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, 'x'.repeat(40)));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 40, 100);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-2', 'p-3']);
    expect(overflowPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1']);
  });

  test('should include a post whose text exactly fills the remaining budget', () => {
    // Budget 80 = two 40-char posts exactly; nothing overflows on the size boundary.
    const posts = Array.from({ length: 2 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, 'x'.repeat(40)));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 40, 80);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1']);
    expect(overflowPosts).toHaveLength(0);
  });

  test('should truncate a single oversized post to its per-post cap and still send it', () => {
    const posts = [pendingPost('twitter', 'user', 'p-0', 'x'.repeat(10_000))];
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 40, MAX_AI_INPUT_CHARS, 4_000);
    expect(aiPosts).toHaveLength(1);
    expect(aiPosts[0].postId).toEqual('p-0');
    expect(aiPosts[0].text).toHaveLength(4_000);
    expect(aiPosts[0].text?.endsWith('…')).toBe(true);
    expect(overflowPosts).toHaveLength(0);
  });

  test('should always keep the newest post even when it alone exceeds the input budget', () => {
    const posts = [
      pendingPost('twitter', 'user', 'old', 'x'.repeat(40)),
      pendingPost('twitter', 'user', 'newest', 'x'.repeat(500)),
    ];
    // Input budget 50 is smaller than the newest post; it is truncated to the per-post cap and kept.
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 40, 50, 30);
    expect(aiPosts.map((post) => post.postId)).toEqual(['newest']);
    expect(aiPosts[0].text).toHaveLength(30);
    expect(overflowPosts.map((post) => post.postId)).toEqual(['old']);
  });

  test('should not mutate or truncate posts that fit the budget', () => {
    const posts = [pendingPost('twitter', 'user', 'p-0', 'hello'), pendingPost('twitter', 'user', 'p-1', 'world')];
    const { aiPosts } = splitForAiBudget(posts, 40, MAX_AI_INPUT_CHARS, MAX_AI_CHARS_PER_POST);
    expect(aiPosts[0]).toBe(posts[0]);
    expect(aiPosts[1]).toBe(posts[1]);
  });

  test('should count truncated post text against the shared budget', () => {
    // Per-post cap 100 truncates each 500-char post to 100 chars; a 250-char input budget fits two.
    const posts = Array.from({ length: 4 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, 'x'.repeat(500)));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 40, 250, 100);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-2', 'p-3']);
    expect(aiPosts.every((post) => post.text?.length === 100)).toBe(true);
    expect(overflowPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1']);
  });

  test('should apply the count cap before the text budget', () => {
    // 5 posts, count cap 3 → newest 3 considered; text budget 80 (40 each) fits only 2 of those.
    const posts = Array.from({ length: 5 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, 'x'.repeat(40)));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 3, 80);
    expect(aiPosts.map((post) => post.postId)).toEqual(['p-3', 'p-4']);
    expect(overflowPosts.map((post) => post.postId)).toEqual(['p-0', 'p-1', 'p-2']);
  });

  test('should keep every post accounted for across aiPosts and overflow', () => {
    const posts = Array.from({ length: 10 }, (_, i) => pendingPost('twitter', 'user', `p-${i}`, 'x'.repeat(40)));
    const { aiPosts, overflowPosts } = splitForAiBudget(posts, 6, 120);
    expect(aiPosts.length + overflowPosts.length).toEqual(10);
    const ids = [...overflowPosts, ...aiPosts].map((post) => post.postId);
    expect(new Set(ids).size).toEqual(10);
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
});
