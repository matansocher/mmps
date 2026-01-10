import type { RapidAPIUserInfoResponse } from '../types';
import { extractSecUid, formatUserInfo } from './format-user';

describe('formatUserInfo', () => {
  const createMockResponse = (overrides: Partial<RapidAPIUserInfoResponse> = {}): RapidAPIUserInfoResponse => ({
    userInfo: {
      user: {
        id: '123456789',
        uniqueId: 'testuser',
        nickname: 'Test User',
        avatarThumb: 'https://example.com/avatar.jpg',
        signature: 'Hello, I make videos!',
        verified: true,
        secUid: 'MS4wLjABAAAA...',
      },
      stats: {
        followerCount: 1000000,
        followingCount: 500,
        videoCount: 200,
        heartCount: 5000000,
      },
    },
    ...overrides,
  });

  it('should format complete user info correctly', () => {
    const response = createMockResponse();
    const result = formatUserInfo(response, 'testuser');

    expect(result.id).toBe('123456789');
    expect(result.username).toBe('testuser');
    expect(result.nickname).toBe('Test User');
    expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(result.bio).toBe('Hello, I make videos!');
    expect(result.followerCount).toBe(1000000);
    expect(result.followingCount).toBe(500);
    expect(result.videoCount).toBe(200);
    expect(result.likeCount).toBe(5000000);
    expect(result.verified).toBe(true);
    expect(result.secUid).toBe('MS4wLjABAAAA...');
  });

  it('should use fallback username when uniqueId is missing', () => {
    const response = createMockResponse({
      userInfo: {
        user: { id: '123' },
        stats: {},
      },
    });
    const result = formatUserInfo(response, 'fallbackuser');

    expect(result.username).toBe('fallbackuser');
  });

  it('should default to empty strings for missing user fields', () => {
    const response: RapidAPIUserInfoResponse = { userInfo: {} };
    const result = formatUserInfo(response, 'testuser');

    expect(result.id).toBe('');
    expect(result.nickname).toBe('');
    expect(result.avatarUrl).toBe('');
    expect(result.bio).toBe('');
  });

  it('should default to 0 for missing stats', () => {
    const response: RapidAPIUserInfoResponse = { userInfo: {} };
    const result = formatUserInfo(response, 'testuser');

    expect(result.followerCount).toBe(0);
    expect(result.followingCount).toBe(0);
    expect(result.videoCount).toBe(0);
    expect(result.likeCount).toBe(0);
  });

  it('should default verified to false when missing', () => {
    const response: RapidAPIUserInfoResponse = { userInfo: {} };
    const result = formatUserInfo(response, 'testuser');

    expect(result.verified).toBe(false);
  });

  it('should handle completely empty response', () => {
    const response: RapidAPIUserInfoResponse = {};
    const result = formatUserInfo(response, 'testuser');

    expect(result.username).toBe('testuser');
    expect(result.id).toBe('');
    expect(result.followerCount).toBe(0);
  });

  it('should handle large follower counts', () => {
    const response = createMockResponse({
      userInfo: {
        user: { id: '123', uniqueId: 'bigcreator' },
        stats: { followerCount: 150000000 },
      },
    });
    const result = formatUserInfo(response, 'bigcreator');

    expect(result.followerCount).toBe(150000000);
  });
});

describe('extractSecUid', () => {
  it('should extract secUid from response', () => {
    const response: RapidAPIUserInfoResponse = {
      userInfo: {
        user: {
          secUid: 'MS4wLjABAAAAtest123',
        },
      },
    };

    expect(extractSecUid(response)).toBe('MS4wLjABAAAAtest123');
  });

  it('should return undefined when secUid is missing', () => {
    const response: RapidAPIUserInfoResponse = {
      userInfo: {
        user: {},
      },
    };

    expect(extractSecUid(response)).toBeUndefined();
  });

  it('should return undefined when user is missing', () => {
    const response: RapidAPIUserInfoResponse = {
      userInfo: {},
    };

    expect(extractSecUid(response)).toBeUndefined();
  });

  it('should return undefined when userInfo is missing', () => {
    const response: RapidAPIUserInfoResponse = {};

    expect(extractSecUid(response)).toBeUndefined();
  });
});
