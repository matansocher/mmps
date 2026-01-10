import type { RapidAPIVideoItem } from '../types';
import { formatVideo } from './format-video';

describe('formatVideo', () => {
  const createMockVideoItem = (overrides: Partial<RapidAPIVideoItem> = {}): RapidAPIVideoItem => ({
    id: 'video123',
    desc: 'This is a test video description',
    createTime: 1704067200, // 2024-01-01 00:00:00 UTC
    stats: {
      playCount: 1000000,
      diggCount: 50000,
      commentCount: 1000,
      shareCount: 500,
    },
    video: {
      duration: 60,
    },
    author: {
      id: 'author123',
      uniqueId: 'testcreator',
      nickname: 'Test Creator',
      avatarThumb: 'https://example.com/avatar.jpg',
    },
    music: {
      id: 'music123',
      title: 'Original Sound',
      authorName: 'Test Creator',
    },
    ...overrides,
  });

  it('should format complete video data correctly', () => {
    const item = createMockVideoItem();
    const result = formatVideo(item);

    expect(result.id).toBe('video123');
    expect(result.url).toBe('https://www.tiktok.com/@testcreator/video/video123');
    expect(result.description).toBe('This is a test video description');
    expect(result.duration).toBe(60);
  });

  it('should format video stats correctly', () => {
    const item = createMockVideoItem();
    const result = formatVideo(item);

    expect(result.stats.views).toBe(1000000);
    expect(result.stats.likes).toBe(50000);
    expect(result.stats.comments).toBe(1000);
    expect(result.stats.shares).toBe(500);
  });

  it('should format author info correctly', () => {
    const item = createMockVideoItem();
    const result = formatVideo(item);

    expect(result.author.id).toBe('author123');
    expect(result.author.username).toBe('testcreator');
    expect(result.author.nickname).toBe('Test Creator');
    expect(result.author.avatarUrl).toBe('https://example.com/avatar.jpg');
  });

  it('should format music info correctly', () => {
    const item = createMockVideoItem();
    const result = formatVideo(item);

    expect(result.music).toBeDefined();
    expect(result.music!.id).toBe('music123');
    expect(result.music!.title).toBe('Original Sound');
    expect(result.music!.author).toBe('Test Creator');
  });

  it('should handle video without music', () => {
    const item = createMockVideoItem({ music: undefined });
    const result = formatVideo(item);

    expect(result.music).toBeUndefined();
  });

  it('should use fallback stats when nested stats is missing', () => {
    const item: RapidAPIVideoItem = {
      id: 'video123',
      playCount: 5000,
      diggCount: 200,
      commentCount: 50,
      shareCount: 10,
    };
    const result = formatVideo(item);

    expect(result.stats.views).toBe(5000);
    expect(result.stats.likes).toBe(200);
    expect(result.stats.comments).toBe(50);
    expect(result.stats.shares).toBe(10);
  });

  it('should use fallback duration when video.duration is missing', () => {
    const item: RapidAPIVideoItem = {
      id: 'video123',
      duration: 45,
    };
    const result = formatVideo(item);

    expect(result.duration).toBe(45);
  });

  it('should use provided username when author is missing', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item, 'provideduser');

    expect(result.url).toBe('https://www.tiktok.com/@provideduser/video/video123');
    expect(result.author.username).toBe('provideduser');
  });

  it('should default to empty strings when no author info available', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item);

    expect(result.author.id).toBe('');
    expect(result.author.username).toBe('');
    expect(result.author.nickname).toBe('');
  });

  it('should format createdAt as ISO string', () => {
    const item = createMockVideoItem({ createTime: 1704067200 });
    const result = formatVideo(item);

    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('should use current date when createTime is missing', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item);

    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should default to empty description when missing', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item);

    expect(result.description).toBe('');
  });

  it('should default stats to 0 when all missing', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item);

    expect(result.stats.views).toBe(0);
    expect(result.stats.likes).toBe(0);
    expect(result.stats.comments).toBe(0);
    expect(result.stats.shares).toBe(0);
  });

  it('should default duration to 0 when missing', () => {
    const item: RapidAPIVideoItem = { id: 'video123' };
    const result = formatVideo(item);

    expect(result.duration).toBe(0);
  });
});
