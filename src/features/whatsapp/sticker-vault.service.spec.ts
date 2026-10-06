import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { sleep } from '@core/utils';
import { downloadWhatsAppMedia, sendWhatsAppMessage, sendWhatsAppSticker, sendWhatsAppTypingIndicator, uploadWhatsAppMedia } from '@services/whatsapp';
import { STICKER_SEARCH_LIMIT, STICKER_SEND_DELAY_MS } from './constants';
import * as repo from './mongo';
import { fitStickerToLimit } from './sticker-image';
import { handleIncomingMessage } from './sticker-vault.service';
import type { StickerSummary } from './types';

vi.mock('@core/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@core/utils')>()),
  sleep: vi.fn(async () => undefined),
}));

vi.mock('@services/whatsapp', () => ({
  describeWhatsAppError: vi.fn(() => 'error'),
  downloadWhatsAppMedia: vi.fn(),
  isWhatsAppPairRateLimitError: vi.fn((err: { code?: number }) => err?.code === 131056),
  sendWhatsAppMessage: vi.fn(async () => undefined),
  sendWhatsAppSticker: vi.fn(async () => 'wamid.sent'),
  sendWhatsAppTypingIndicator: vi.fn(async () => undefined),
  uploadWhatsAppMedia: vi.fn(async () => 'media.new'),
}));

vi.mock('./mongo', () => ({
  addStickerMessageId: vi.fn(async () => undefined),
  addStickerTags: vi.fn(async (_id, tags: string[]) => tags),
  countStickers: vi.fn(async () => 0),
  createSticker: vi.fn(async () => undefined),
  deleteSticker: vi.fn(async () => undefined),
  findStickerByMessageId: vi.fn(async () => null),
  findStickerBySha: vi.fn(async () => null),
  getRandomSticker: vi.fn(async () => null),
  getStickerData: vi.fn(async () => Buffer.from('webp')),
  markStickerReceived: vi.fn(async () => undefined),
  recordSearchEvent: vi.fn(async () => undefined),
  removeStickerTags: vi.fn(async () => []),
  replaceStickerData: vi.fn(async () => undefined),
  searchStickers: vi.fn(async () => []),
  setStickerMedia: vi.fn(async () => undefined),
}));

vi.mock('./sticker-image', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sticker-image')>()),
  fitStickerToLimit: vi.fn(async (data: Buffer) => data),
}));

const FROM = '972500000000';
const sticker = (overrides: Partial<StickerSummary> = {}): StickerSummary => ({
  _id: new ObjectId(),
  ownerPhone: FROM,
  sha256: 'abc',
  mimeType: 'image/webp',
  animated: false,
  byteSize: 4,
  tags: [],
  messageIds: ['wamid.in'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
const text = (body: string, contextId?: string) => handleIncomingMessage({ kind: 'text', from: FROM, id: 'wamid.text', text: body, ...(contextId && { contextId }) });

describe('handleIncomingMessage()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should show the typing indicator for every incoming message', async () => {
    await text('help');
    expect(sendWhatsAppTypingIndicator).toHaveBeenCalledWith('wamid.text');
  });

  describe('stickers', () => {
    const data = Buffer.from('sticker-bytes');
    const sha256 = createHash('sha256').update(data).digest('hex');

    beforeEach(() => vi.mocked(downloadWhatsAppMedia).mockResolvedValue({ data, mimeType: 'image/webp' }));

    it('should save a new sticker keyed by its content hash', async () => {
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true });
      expect(repo.createSticker).toHaveBeenCalledWith({ ownerPhone: FROM, sha256, data, mimeType: 'image/webp', animated: true, messageId: 'wamid.in' });
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'נשמר ✅\nהגיבו לסטיקר עם מילים כדי להוסיף מילות חיפוש.');
    });

    it('should not duplicate a sticker that is already saved', async () => {
      const existing = sticker({ tags: ['cat'] });
      vi.mocked(repo.findStickerBySha).mockResolvedValueOnce(existing);
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.again', mediaId: 'm1', animated: false });
      expect(repo.createSticker).not.toHaveBeenCalled();
      expect(repo.findStickerBySha).toHaveBeenCalledWith(expect.any(String));
      expect(repo.markStickerReceived).toHaveBeenCalledWith(existing._id, 'wamid.again');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'קיים 👍\n🔎 מילות חיפוש: cat');
    });

    it('should stay quiet when a concurrent delivery already inserted it', async () => {
      vi.mocked(repo.createSticker).mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: false });
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should save the shrunk version of an oversized sticker', async () => {
      const shrunk = Buffer.from('small');
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(shrunk);
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true });
      expect(fitStickerToLimit).toHaveBeenCalledWith(data, true);
      expect(repo.createSticker).toHaveBeenCalledWith(expect.objectContaining({ sha256, data: shrunk }));
    });

    it('should refuse a sticker that cannot be shrunk under the limit', async () => {
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(null);
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true });
      expect(repo.createSticker).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('גדול מדי'));
    });
  });

  describe('text', () => {
    it('should log the per-step timing of a search', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      await text('cat');
      expect(log).toHaveBeenCalledWith(expect.stringMatching(/Timing for text wamid\.text: .*search=\d+ms.* total=\d+ms/));
      log.mockRestore();
    });

    it('should tag a quoted sticker', async () => {
      const quoted = sticker();
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text('Happy cat', 'wamid.in');
      expect(repo.addStickerTags).toHaveBeenCalledWith(quoted._id, ['happy', 'cat']);
    });

    it('should delete a quoted sticker', async () => {
      const quoted = sticker();
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text('Delete', 'wamid.in');
      expect(repo.findStickerByMessageId).toHaveBeenCalledWith('wamid.in');
      expect(repo.deleteSticker).toHaveBeenCalledWith(quoted._id);
      expect(repo.addStickerTags).not.toHaveBeenCalled();
    });

    it('should let anyone delete a shared sticker', async () => {
      const quoted = sticker({ ownerPhone: '972511111111' });
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text('delete', 'wamid.in');
      expect(repo.deleteSticker).toHaveBeenCalledWith(quoted._id);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'נמחק 🗑️');
    });

    it('should let anyone tag a shared sticker', async () => {
      const quoted = sticker({ ownerPhone: '972511111111' });
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text('cat', 'wamid.in');
      expect(repo.addStickerTags).toHaveBeenCalledWith(quoted._id, ['cat']);
    });

    it('should search on plain text right after a new sticker instead of tagging it', async () => {
      vi.mocked(downloadWhatsAppMedia).mockResolvedValueOnce({ data: Buffer.from('new'), mimeType: 'image/webp' });
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: false });
      await text('cat');
      expect(repo.addStickerTags).not.toHaveBeenCalled();
      expect(repo.searchStickers).toHaveBeenCalledWith(['cat'], STICKER_SEARCH_LIMIT + 1);
    });

    it('should send matching stickers, reusing a fresh cached media id', async () => {
      const match = sticker({ tags: ['cat'], mediaId: 'media.cached', mediaUploadedAt: new Date() });
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([match]);
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.cached');
      expect(uploadWhatsAppMedia).not.toHaveBeenCalled();
      expect(repo.addStickerMessageId).toHaveBeenCalledWith(match._id, 'wamid.sent');
    });

    it('should re-upload when the cached media id is stale', async () => {
      const match = sticker({ tags: ['cat'], mediaId: 'media.old', mediaUploadedAt: new Date('2020-01-01') });
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([match]);
      await text('cat');
      expect(uploadWhatsAppMedia).toHaveBeenCalledWith(Buffer.from('webp'), 'image/webp', 'sticker.webp');
      expect(repo.setStickerMedia).toHaveBeenCalledWith(match._id, 'media.new');
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.new');
    });

    it('should re-upload when sending with the cached media id fails', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker({ mediaId: 'media.cached', mediaUploadedAt: new Date() })]);
      vi.mocked(sendWhatsAppSticker).mockRejectedValueOnce(new Error('expired'));
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenLastCalledWith(FROM, 'media.new');
    });

    it('should shrink a stored oversized sticker and skip its cached media id', async () => {
      const match = sticker({ animated: true, byteSize: 700 * 1024, mediaId: 'media.cached', mediaUploadedAt: new Date() });
      const shrunk = Buffer.from('small');
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([match]);
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(shrunk);
      await text('cat');
      expect(repo.replaceStickerData).toHaveBeenCalledWith(match._id, shrunk);
      expect(uploadWhatsAppMedia).toHaveBeenCalledWith(shrunk, 'image/webp', 'sticker.webp');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(1);
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.new');
    });

    it('should record the size of a legacy sticker that already fits', async () => {
      const match = sticker({ byteSize: undefined });
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([match]);
      await text('cat');
      expect(repo.replaceStickerData).toHaveBeenCalledWith(match._id, Buffer.from('webp'));
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.new');
    });

    it('should keep sending other matches when one fails, then say so', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker({ byteSize: undefined }), sticker()]);
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(null);
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(1);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('1 מתוך 2'));
    });

    it('should say when nothing matches', async () => {
      await text('dog');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('לא נמצאו סטיקרים'));
      expect(sendWhatsAppSticker).not.toHaveBeenCalled();
    });

    it('should send a random sticker', async () => {
      vi.mocked(repo.getRandomSticker).mockResolvedValueOnce(sticker());
      await text('random');
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.new');
    });

    it('should reply with help and the sticker count', async () => {
      vi.mocked(repo.countStickers).mockResolvedValueOnce(3);
      await text('help');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('במאגר יש 3 סטיקרים'));
    });

    test.each(['מחק', '-', 'delete'])('should delete a quoted sticker on "%s"', async (body) => {
      const quoted = sticker();
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text(body, 'wamid.in');
      expect(repo.deleteSticker).toHaveBeenCalledWith(quoted._id);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'נמחק 🗑️');
    });

    it('should add and remove tags in one quote-reply and list the result', async () => {
      const quoted = sticker({ tags: ['לילה', 'cat'] });
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      vi.mocked(repo.addStickerTags).mockResolvedValueOnce(['לילה', 'cat', 'טוב']);
      vi.mocked(repo.removeStickerTags).mockResolvedValueOnce(['cat', 'טוב']);
      await text('טוב -לילה', 'wamid.in');
      expect(repo.addStickerTags).toHaveBeenCalledWith(quoted._id, ['טוב']);
      expect(repo.removeStickerTags).toHaveBeenCalledWith(quoted._id, ['לילה']);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'עודכן ✅\n🔎 מילות חיפוש: cat, טוב');
    });

    it('should accept a trailing "-" for removal and say when no tags are left', async () => {
      const quoted = sticker({ tags: ['לילה'] });
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(quoted);
      await text('לילה-', 'wamid.in');
      expect(repo.addStickerTags).not.toHaveBeenCalled();
      expect(repo.removeStickerTags).toHaveBeenCalledWith(quoted._id, ['לילה']);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'עודכן ✅\nאין מילות חיפוש');
    });

    it('should search for the words of a plain "-word" message', async () => {
      await text('-cat');
      expect(repo.searchStickers).toHaveBeenCalledWith(['cat'], STICKER_SEARCH_LIMIT + 1);
    });

    test.each(['אקראי', 'random'])('should send a random sticker on "%s"', async (body) => {
      vi.mocked(repo.getRandomSticker).mockResolvedValueOnce(sticker());
      await text(body);
      expect(sendWhatsAppSticker).toHaveBeenCalledWith(FROM, 'media.new');
    });

    it('should reply with help on "עזרה"', async () => {
      vi.mocked(repo.countStickers).mockResolvedValueOnce(1);
      await text('עזרה');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('במאגר יש סטיקר אחד'));
    });

    it('should wait between sends, cap the results and say there are more', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(Array.from({ length: STICKER_SEARCH_LIMIT + 1 }, () => sticker()));
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(STICKER_SEARCH_LIMIT);
      expect(sleep).toHaveBeenCalledTimes(STICKER_SEARCH_LIMIT - 1);
      expect(sleep).toHaveBeenCalledWith(STICKER_SEND_DELAY_MS);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('יש עוד סטיקרים'));
    });

    it('should not mention more results when all matches were sent', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker()]);
      await text('cat');
      expect(sleep).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should stop sending and ask to retry on the pair rate limit', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(Array.from({ length: STICKER_SEARCH_LIMIT + 1 }, () => sticker()));
      vi.mocked(sendWhatsAppSticker).mockResolvedValueOnce('wamid.1').mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(2);
      expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('נסו שוב'));
    });

    it('should not re-upload a cached sticker when hitting the pair rate limit', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker({ mediaId: 'media.cached', mediaUploadedAt: new Date() })]);
      vi.mocked(sendWhatsAppSticker).mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(uploadWhatsAppMedia).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('נסו שוב'));
    });
  });

  describe('search metrics', () => {
    it('should record a search with the stickers it sent', async () => {
      const matches = [sticker(), sticker()];
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(matches);
      await text('Happy cat');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith({
        phone: FROM,
        query: 'Happy cat',
        words: ['happy', 'cat'],
        matchedCount: 2,
        hasMore: false,
        sentStickerIds: matches.map((m) => m._id),
        failedCount: 0,
        rateLimited: false,
        durationMs: expect.any(Number),
      });
    });

    it('should record a search with no results', async () => {
      await text('dog');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ words: ['dog'], matchedCount: 0, hasMore: false, sentStickerIds: [] }));
    });

    it('should record when there are more results than were sent', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(Array.from({ length: STICKER_SEARCH_LIMIT + 1 }, () => sticker()));
      await text('cat');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ matchedCount: STICKER_SEARCH_LIMIT + 1, hasMore: true }));
    });

    it('should record failed sends and the pair rate limit', async () => {
      const matches = [sticker({ byteSize: undefined }), sticker(), sticker()];
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(matches);
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(null);
      vi.mocked(sendWhatsAppSticker).mockResolvedValueOnce('wamid.1').mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ sentStickerIds: [matches[1]._id], failedCount: 1, rateLimited: true }));
    });

    test.each(['help', 'random'])('should not record "%s"', async (body) => {
      await text(body);
      expect(repo.recordSearchEvent).not.toHaveBeenCalled();
    });

    it('should not record a tag edit', async () => {
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(sticker());
      await text('cat', 'wamid.in');
      expect(repo.recordSearchEvent).not.toHaveBeenCalled();
    });

    it('should still reply when recording the search fails', async () => {
      vi.mocked(repo.recordSearchEvent).mockRejectedValueOnce(new Error('mongo down'));
      await expect(text('dog')).resolves.toBeUndefined();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('לא נמצאו סטיקרים'));
    });
  });
});
