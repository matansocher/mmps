import type { SupadataVideoResponse } from '../types';
import { buildVideoUrl, formatVideo } from './format-video';

describe('buildVideoUrl', () => {
  it('should build correct YouTube video URL', () => {
    expect(buildVideoUrl('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('should handle empty video ID', () => {
    expect(buildVideoUrl('')).toBe('https://www.youtube.com/watch?v=');
  });
});

describe('formatVideo', () => {
  const createMockResponse = (overrides: Partial<SupadataVideoResponse> = {}): SupadataVideoResponse => ({
    id: 'dQw4w9WgXcQ',
    title: 'Test Video Title',
    description: 'This is a test video description that explains what the video is about.',
    duration: 212,
    uploadDate: '2024-01-15',
    viewCount: 1000000,
    likeCount: 50000,
    commentCount: 2000,
    channel: {
      id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
      name: 'Test Channel',
      handle: '@TestChannel',
    },
    transcriptLanguages: ['en', 'es', 'fr'],
    thumbnail: 'https://example.com/thumbnail.jpg',
    ...overrides,
  });

  it('should format complete video data correctly', () => {
    const response = createMockResponse();
    const result = formatVideo(response);

    expect(result.id).toBe('dQw4w9WgXcQ');
    expect(result.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.title).toBe('Test Video Title');
    expect(result.duration).toBe(212);
    expect(result.thumbnailUrl).toBe('https://example.com/thumbnail.jpg');
  });

  it('should format video stats correctly', () => {
    const response = createMockResponse();
    const result = formatVideo(response);

    expect(result.stats.views).toBe(1000000);
    expect(result.stats.likes).toBe(50000);
    expect(result.stats.comments).toBe(2000);
  });

  it('should format channel info correctly', () => {
    const response = createMockResponse();
    const result = formatVideo(response);

    expect(result.channel).toBeDefined();
    expect(result.channel!.id).toBe('UCuAXFkgsw1L7xaCfnd5JJOw');
    expect(result.channel!.name).toBe('Test Channel');
    expect(result.channel!.handle).toBe('@TestChannel');
  });

  it('should handle video without channel info', () => {
    const response = createMockResponse({ channel: undefined });
    const result = formatVideo(response);

    expect(result.channel).toBeUndefined();
  });

  it('should format duration correctly for short videos', () => {
    const response = createMockResponse({ duration: 45 });
    const result = formatVideo(response);

    expect(result.duration).toBe(45);
    expect(result.durationFormatted).toBe('0:45');
  });

  it('should format duration correctly for videos under an hour', () => {
    const response = createMockResponse({ duration: 185 }); // 3:05
    const result = formatVideo(response);

    expect(result.durationFormatted).toBe('3:05');
  });

  it('should format duration correctly for videos over an hour', () => {
    const response = createMockResponse({ duration: 3725 }); // 1:02:05
    const result = formatVideo(response);

    expect(result.durationFormatted).toBe('1:02:05');
  });

  it('should format duration correctly for exactly one hour', () => {
    const response = createMockResponse({ duration: 3600 });
    const result = formatVideo(response);

    expect(result.durationFormatted).toBe('1:00:00');
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'A'.repeat(300);
    const response = createMockResponse({ description: longDescription });
    const result = formatVideo(response);

    expect(result.description!.length).toBe(203); // 200 + '...'
    expect(result.description!.endsWith('...')).toBe(true);
  });

  it('should not truncate short descriptions', () => {
    const shortDescription = 'Short description';
    const response = createMockResponse({ description: shortDescription });
    const result = formatVideo(response);

    expect(result.description).toBe('Short description');
  });

  it('should handle missing description', () => {
    const response = createMockResponse({ description: undefined });
    const result = formatVideo(response);

    expect(result.description).toBeUndefined();
  });

  it('should use uploadDate for publishedAt', () => {
    const response = createMockResponse({
      uploadDate: '2024-01-15',
      publishedAt: undefined,
    });
    const result = formatVideo(response);

    expect(result.publishedAt).toBe('2024-01-15');
  });

  it('should use publishedAt as fallback', () => {
    const response = createMockResponse({
      uploadDate: undefined,
      publishedAt: '2024-01-20T10:00:00Z',
    });
    const result = formatVideo(response);

    expect(result.publishedAt).toBe('2024-01-20T10:00:00Z');
  });

  it('should default to empty string when both dates missing', () => {
    const response = createMockResponse({
      uploadDate: undefined,
      publishedAt: undefined,
    });
    const result = formatVideo(response);

    expect(result.publishedAt).toBe('');
  });

  it('should include transcript languages', () => {
    const response = createMockResponse({
      transcriptLanguages: ['en', 'es', 'de'],
    });
    const result = formatVideo(response);

    expect(result.transcriptLanguages).toEqual(['en', 'es', 'de']);
  });

  it('should default transcript languages to empty array', () => {
    const response = createMockResponse({
      transcriptLanguages: undefined,
    });
    const result = formatVideo(response);

    expect(result.transcriptLanguages).toEqual([]);
  });

  it('should default stats to 0 when missing', () => {
    const response: SupadataVideoResponse = { id: 'test' };
    const result = formatVideo(response);

    expect(result.stats.views).toBe(0);
    expect(result.stats.likes).toBe(0);
    expect(result.stats.comments).toBeUndefined();
  });

  it('should default id and title to empty strings', () => {
    const response: SupadataVideoResponse = {};
    const result = formatVideo(response);

    expect(result.id).toBe('');
    expect(result.title).toBe('');
  });

  it('should default duration to 0 and format as 0:00', () => {
    const response: SupadataVideoResponse = {};
    const result = formatVideo(response);

    expect(result.duration).toBe(0);
    expect(result.durationFormatted).toBe('0:00');
  });
});
