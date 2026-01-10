import { extractChannelIdentifier } from './extract-channel-identifier';

describe('extractChannelIdentifier', () => {
  describe('YouTube URLs with handle (@)', () => {
    it('should extract handle from youtube.com/@handle URL', () => {
      expect(extractChannelIdentifier('https://youtube.com/@Fireship')).toBe('@Fireship');
    });

    it('should extract handle from www.youtube.com/@handle URL', () => {
      expect(extractChannelIdentifier('https://www.youtube.com/@Fireship')).toBe('@Fireship');
    });

    it('should extract handle from URL with trailing slash', () => {
      expect(extractChannelIdentifier('https://youtube.com/@Fireship/')).toBe('@Fireship');
    });

    it('should extract handle from URL with query params', () => {
      expect(extractChannelIdentifier('https://youtube.com/@Fireship?sub=1')).toBe('@Fireship');
    });

    it('should extract handle from URL with additional path', () => {
      expect(extractChannelIdentifier('https://youtube.com/@Fireship/videos')).toBe('@Fireship');
    });
  });

  describe('YouTube URLs with channel ID', () => {
    it('should extract channel ID from /channel/ URL', () => {
      expect(extractChannelIdentifier('https://youtube.com/channel/UCsBjURrPoezykLs9EqgamOA')).toBe('UCsBjURrPoezykLs9EqgamOA');
    });

    it('should extract channel ID from URL with trailing slash', () => {
      expect(extractChannelIdentifier('https://youtube.com/channel/UCsBjURrPoezykLs9EqgamOA/')).toBe('UCsBjURrPoezykLs9EqgamOA');
    });

    it('should extract channel ID from URL with additional path', () => {
      expect(extractChannelIdentifier('https://youtube.com/channel/UCsBjURrPoezykLs9EqgamOA/videos')).toBe('UCsBjURrPoezykLs9EqgamOA');
    });
  });

  describe('YouTube URLs with custom URL (/c/)', () => {
    it('should extract custom name from /c/ URL', () => {
      expect(extractChannelIdentifier('https://youtube.com/c/SomeChannel')).toBe('SomeChannel');
    });

    it('should extract custom name from /user/ URL', () => {
      expect(extractChannelIdentifier('https://youtube.com/user/SomeUser')).toBe('SomeUser');
    });
  });

  describe('plain handles', () => {
    it('should return handle as-is when already prefixed with @', () => {
      expect(extractChannelIdentifier('@Fireship')).toBe('@Fireship');
    });

    it('should add @ prefix to plain channel name', () => {
      expect(extractChannelIdentifier('Fireship')).toBe('@Fireship');
    });

    it('should trim whitespace and add @ prefix', () => {
      expect(extractChannelIdentifier('  Fireship  ')).toBe('@Fireship');
    });
  });

  describe('channel IDs (UC...)', () => {
    it('should return 24-char channel ID starting with UC as-is', () => {
      expect(extractChannelIdentifier('UCsBjURrPoezykLs9EqgamOA')).toBe('UCsBjURrPoezykLs9EqgamOA');
    });

    it('should add @ to UC string that is not 24 chars', () => {
      expect(extractChannelIdentifier('UC123')).toBe('@UC123');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(extractChannelIdentifier('')).toBe('@');
    });

    it('should handle whitespace only', () => {
      expect(extractChannelIdentifier('   ')).toBe('@');
    });

    it('should handle URL without protocol by treating it as plain text', () => {
      // URLs without protocol fail URL parsing and are treated as plain text
      expect(extractChannelIdentifier('youtube.com/@Fireship')).toBe('@youtube.com/@Fireship');
    });

    it('should handle mixed case handles', () => {
      expect(extractChannelIdentifier('FireShip')).toBe('@FireShip');
    });

    it('should handle handles with numbers', () => {
      expect(extractChannelIdentifier('Channel123')).toBe('@Channel123');
    });

    it('should handle handles with underscores', () => {
      expect(extractChannelIdentifier('my_channel')).toBe('@my_channel');
    });
  });
});
