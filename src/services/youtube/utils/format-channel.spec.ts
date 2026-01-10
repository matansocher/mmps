import type { SupadataChannelResponse } from '../types';
import { formatChannel } from './format-channel';

describe('formatChannel', () => {
  const createMockResponse = (overrides: Partial<SupadataChannelResponse> = {}): SupadataChannelResponse => ({
    id: 'UCsBjURrPoezykLs9EqgamOA',
    name: 'Fireship',
    handle: '@Fireship',
    description: 'High-intensity code tutorials to help you build & ship your app faster.',
    subscriberCount: 2500000,
    videoCount: 500,
    viewCount: 300000000,
    thumbnail: 'https://example.com/thumbnail.jpg',
    customUrl: 'fireship',
    ...overrides,
  });

  it('should format complete channel data correctly', () => {
    const response = createMockResponse();
    const result = formatChannel(response);

    expect(result.id).toBe('UCsBjURrPoezykLs9EqgamOA');
    expect(result.name).toBe('Fireship');
    expect(result.handle).toBe('@Fireship');
    expect(result.description).toBe('High-intensity code tutorials to help you build & ship your app faster.');
    expect(result.subscriberCount).toBe(2500000);
    expect(result.videoCount).toBe(500);
    expect(result.viewCount).toBe(300000000);
    expect(result.thumbnailUrl).toBe('https://example.com/thumbnail.jpg');
    expect(result.customUrl).toBe('fireship');
  });

  it('should use title as fallback for name', () => {
    const response = createMockResponse({
      name: undefined,
      title: 'Channel Title',
    });
    const result = formatChannel(response);

    expect(result.name).toBe('Channel Title');
  });

  it('should prefer name over title', () => {
    const response = createMockResponse({
      name: 'Channel Name',
      title: 'Channel Title',
    });
    const result = formatChannel(response);

    expect(result.name).toBe('Channel Name');
  });

  it('should default to empty string when both name and title are missing', () => {
    const response: SupadataChannelResponse = {};
    const result = formatChannel(response);

    expect(result.name).toBe('');
  });

  it('should default id to empty string when missing', () => {
    const response: SupadataChannelResponse = {};
    const result = formatChannel(response);

    expect(result.id).toBe('');
  });

  it('should default subscriberCount to 0 when missing', () => {
    const response: SupadataChannelResponse = {};
    const result = formatChannel(response);

    expect(result.subscriberCount).toBe(0);
  });

  it('should default videoCount to 0 when missing', () => {
    const response: SupadataChannelResponse = {};
    const result = formatChannel(response);

    expect(result.videoCount).toBe(0);
  });

  it('should pass through optional fields as undefined', () => {
    const response: SupadataChannelResponse = {
      id: 'test',
      name: 'Test Channel',
    };
    const result = formatChannel(response);

    expect(result.handle).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.viewCount).toBeUndefined();
    expect(result.thumbnailUrl).toBeUndefined();
    expect(result.customUrl).toBeUndefined();
  });

  it('should handle large subscriber counts', () => {
    const response = createMockResponse({
      subscriberCount: 150000000,
    });
    const result = formatChannel(response);

    expect(result.subscriberCount).toBe(150000000);
  });

  it('should handle channel with zero stats', () => {
    const response = createMockResponse({
      subscriberCount: 0,
      videoCount: 0,
      viewCount: 0,
    });
    const result = formatChannel(response);

    expect(result.subscriberCount).toBe(0);
    expect(result.videoCount).toBe(0);
    expect(result.viewCount).toBe(0);
  });
});
