import { describe, expect, test } from 'vitest';
import type { PendingPost, SocialPlatform } from '@shared/social-follower';
import { chunkSections, groupPostsByUser, isLongPost, targetKeyPointsCount } from './social-media-digest';
import type { DigestSection } from './social-media-digest';

function pendingPost(platform: SocialPlatform, username: string, postId: string): PendingPost {
  return {
    platform,
    username,
    chatId: 1,
    postId,
    text: null,
    url: null,
    postedAt: new Date(),
    collectedAt: new Date(),
  };
}

function section(text: string, postCount: number): DigestSection {
  const posts = Array.from({ length: postCount }, (_, i) => pendingPost('twitter', 'user', `${text}-${i}`));
  return { text, posts };
}

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

describe('groupPostsByUser()', () => {  test('should group accounts by platform while preserving account and post order', () => {
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
