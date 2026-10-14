import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { sleep } from '@core/utils';
import { downloadWhatsAppMedia, sendWhatsAppButtons, sendWhatsAppMessage, sendWhatsAppSticker, sendWhatsAppTypingIndicator, uploadWhatsAppMedia } from '@services/whatsapp';
import { STICKER_PAGE_SIZE, STICKER_RATE_LIMIT_BACKOFF_MS, STICKER_SEND_DELAY_MS } from './constants';
import * as repo from './mongo';
import { fitStickerToLimit } from './sticker-image';
import { handleIncomingMessage } from './sticker-vault.service';
import type { SearchEvent, StickerSummary } from './types';

const SEARCH_ID_HEX = '652f1c2b9d3e4a0012345678';

const carsConfig = vi.hoisted(() => ({ stickerId: '0123456789abcdef01234567' }));

vi.mock('./constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./constants')>()),
  get CARS_SURPRISE_STICKER_ID() {
    return carsConfig.stickerId;
  },
}));

vi.mock('@core/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@core/utils')>()),
  sleep: vi.fn(async () => undefined),
}));

vi.mock('@services/whatsapp', () => ({
  describeWhatsAppError: vi.fn(() => 'error'),
  downloadWhatsAppMedia: vi.fn(),
  isWhatsAppPairRateLimitError: vi.fn((err: { code?: number }) => err?.code === 131056),
  sendWhatsAppButtons: vi.fn(async () => undefined),
  sendWhatsAppMessage: vi.fn(async () => undefined),
  sendWhatsAppSticker: vi.fn(async () => 'wamid.sent'),
  sendWhatsAppTypingIndicator: vi.fn(async () => undefined),
  uploadWhatsAppMedia: vi.fn(async () => 'media.new'),
}));

vi.mock('./mongo', () => ({
  addStickerMessageId: vi.fn(async () => undefined),
  addStickerTags: vi.fn(async (_id, tags: string[]) => tags),
  claimSearchPage: vi.fn(async () => null),
  createSticker: vi.fn(async () => undefined),
  deleteSticker: vi.fn(async () => undefined),
  findStickerById: vi.fn(async () => null),
  findStickerByMessageId: vi.fn(async () => null),
  findStickerBySha: vi.fn(async () => null),
  findStickersByIds: vi.fn(async () => []),
  getLatestSearchId: vi.fn(async () => null),
  getStickerData: vi.fn(async () => Buffer.from('webp')),
  getTopSearchers: vi.fn(async () => []),
  getTopSearchWords: vi.fn(async () => []),
  getTopStickerTags: vi.fn(async () => []),
  markStickerReceived: vi.fn(async () => undefined),
  nextCarsSearchCount: vi.fn(async () => 1),
  recordSearchEvent: vi.fn(async () => new ObjectId(SEARCH_ID_HEX)),
  recordSearchPage: vi.fn(async () => undefined),
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
const SEARCH_ID = new ObjectId(SEARCH_ID_HEX);
const stickers = (count: number) => Array.from({ length: count }, () => sticker());
const search = (ids: ObjectId[], nextOffset: number): SearchEvent => ({
  _id: SEARCH_ID,
  phone: FROM,
  query: 'cat',
  words: ['cat'],
  matchedCount: ids.length,
  matchedStickerIds: ids,
  nextOffset,
  sentStickerIds: [],
  failedCount: 0,
  rateLimited: false,
  durationMs: 0,
  createdAt: new Date(),
});
const tap = (buttonId: string) => handleIncomingMessage({ kind: 'button', from: FROM, id: 'wamid.tap', buttonId, title: 'עוד ⬇️' });
const text = (body: string, contextId?: string) => handleIncomingMessage({ kind: 'text', from: FROM, id: 'wamid.text', text: body, ...(contextId && { contextId }) });

describe('handleIncomingMessage()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    carsConfig.stickerId = '0123456789abcdef01234567';
  });

  it('should show the typing indicator for every incoming message', async () => {
    await text('cat');
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

    it('should tell the user in Hebrew when saving fails', async () => {
      vi.mocked(repo.createSticker).mockRejectedValueOnce(new Error('you are over your space quota'));
      await expect(handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true })).resolves.toBeUndefined();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'משהו השתבש ולא הצלחתי לשמור את הסטיקר 😕 נסו שוב מאוחר יותר.');
    });

    it('should tell the user in Hebrew when downloading fails', async () => {
      vi.mocked(downloadWhatsAppMedia).mockRejectedValueOnce(new Error('boom'));
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true });
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('משהו השתבש'));
    });
  });

  describe('errors', () => {
    it('should tell the user in Hebrew when searching fails', async () => {
      vi.mocked(repo.searchStickers).mockRejectedValueOnce(new Error('boom'));
      await expect(text('cat')).resolves.toBeUndefined();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'משהו השתבש 😕 נסו שוב מאוחר יותר.');
    });

    it('should tell the user in Hebrew when tagging fails', async () => {
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(sticker());
      vi.mocked(repo.addStickerTags).mockRejectedValueOnce(new Error('boom'));
      await text('cat', 'wamid.in');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'משהו השתבש 😕 נסו שוב מאוחר יותר.');
    });

    it('should not throw when the error reply itself fails', async () => {
      vi.mocked(repo.searchStickers).mockRejectedValueOnce(new Error('boom'));
      vi.mocked(sendWhatsAppMessage).mockRejectedValueOnce(new Error('send failed'));
      await expect(text('cat')).resolves.toBeUndefined();
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
      expect(repo.searchStickers).toHaveBeenCalledWith(['cat']);
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
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'לא נמצאו סטיקרים עבור "dog".');
      expect(sendWhatsAppSticker).not.toHaveBeenCalled();
    });

    test.each(['help', 'עזרה', 'random', 'אקראי'])('should treat "%s" as a plain search', async (body) => {
      await text(body);
      expect(repo.searchStickers).toHaveBeenCalledWith([body]);
      expect(repo.recordSearchEvent).toHaveBeenCalled();
    });

    it('should search by emoji', async () => {
      await text('חתול ❤️');
      expect(repo.searchStickers).toHaveBeenCalledWith(['חתול', '❤']);
    });

    it('should reply with usage when the text has no words', async () => {
      await text('?!');
      expect(repo.searchStickers).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('מאגר הסטיקרים'));
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
      expect(repo.searchStickers).toHaveBeenCalledWith(['cat']);
    });

    it('should not wait when there is a single match', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker()]);
      await text('cat');
      expect(sleep).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should back off and retry once on the pair rate limit, then keep sending', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker(), sticker()]);
      vi.mocked(sendWhatsAppSticker).mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(sleep).toHaveBeenCalledWith(STICKER_RATE_LIMIT_BACKOFF_MS);
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(3);
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should stop sending when the pair rate limit persists and offer to continue from the unsent sticker', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(stickers(3));
      vi.mocked(sendWhatsAppSticker).mockResolvedValueOnce('wamid.1').mockRejectedValueOnce({ code: 131056 }).mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(3);
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, expect.stringContaining('חכו כמה שניות'), [{ id: `more:${SEARCH_ID_HEX}:1`, title: 'עוד ⬇️' }]);
      expect(vi.mocked(sendWhatsAppButtons).mock.calls[0][1]).toContain('יש עוד 2 סטיקרים.');
    });

    it('should not re-upload a cached sticker when hitting the pair rate limit', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker({ mediaId: 'media.cached', mediaUploadedAt: new Date() })]);
      vi.mocked(sendWhatsAppSticker).mockRejectedValueOnce({ code: 131056 }).mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(uploadWhatsAppMedia).not.toHaveBeenCalled();
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, expect.stringContaining('חכו כמה שניות'), [{ id: `more:${SEARCH_ID_HEX}:0`, title: 'עוד ⬇️' }]);
    });
  });

  describe('cars surprise', () => {
    beforeEach(() => {
      const counts = new Map<string, number>();
      vi.mocked(repo.nextCarsSearchCount).mockImplementation(async (phone) => {
        const count = (counts.get(phone) ?? 0) + 1;
        counts.set(phone, count);
        return count;
      });
    });

    it('should repeat regular, regular, surprise for each three searches and record the actual sticker', async () => {
      const regular = sticker({ tags: ['מכוניות'], mediaId: 'media.regular', mediaUploadedAt: new Date() });
      const surprise = sticker({ _id: new ObjectId(carsConfig.stickerId), mediaId: 'media.surprise', mediaUploadedAt: new Date() });
      vi.mocked(repo.searchStickers).mockResolvedValue([regular]);
      vi.mocked(repo.findStickerById).mockResolvedValue(surprise);

      for (let i = 0; i < 6; i++) await text(' מכוניות ');

      expect(vi.mocked(sendWhatsAppSticker).mock.calls.map(([, mediaId]) => mediaId)).toEqual(['media.regular', 'media.regular', 'media.surprise', 'media.regular', 'media.regular', 'media.surprise']);
      expect(repo.searchStickers).toHaveBeenCalledTimes(4);
      expect(repo.findStickerById).toHaveBeenCalledWith(surprise._id);
      expect(repo.recordSearchEvent).toHaveBeenLastCalledWith(expect.objectContaining({ matchedCount: 1, matchedStickerIds: [surprise._id], nextOffset: 1, sentStickerIds: [surprise._id] }));
      expect(repo.addStickerTags).not.toHaveBeenCalled();
    });

    it('should keep separate counts per sender', async () => {
      await text('מכוניות');
      await text('מכוניות');
      await handleIncomingMessage({ kind: 'text', from: '972511111111', id: 'wamid.other', text: 'מכוניות' });
      expect(repo.findStickerById).not.toHaveBeenCalled();
      await text('מכוניות');
      expect(repo.findStickerById).toHaveBeenCalledTimes(1);
    });

    it('should page regular results without counting more taps and replace the entire third result set', async () => {
      const matches = stickers(STICKER_PAGE_SIZE + 2);
      const ids = matches.map((match) => match._id);
      const surprise = sticker({ _id: new ObjectId(carsConfig.stickerId), mediaId: 'media.surprise', mediaUploadedAt: new Date() });
      vi.mocked(repo.searchStickers).mockResolvedValue(matches);
      vi.mocked(repo.findStickerById).mockResolvedValue(surprise);
      await text('מכוניות');
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, 'יש עוד 2 סטיקרים.', expect.any(Array));

      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(SEARCH_ID);
      vi.mocked(repo.claimSearchPage).mockResolvedValueOnce(search(ids, STICKER_PAGE_SIZE * 2));
      vi.mocked(repo.findStickersByIds).mockResolvedValueOnce(matches.slice(STICKER_PAGE_SIZE));
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(repo.nextCarsSearchCount).toHaveBeenCalledTimes(1);

      await text('מכוניות');
      vi.mocked(sendWhatsAppButtons).mockClear();
      vi.mocked(sendWhatsAppSticker).mockClear();
      await text('מכוניות');
      expect(repo.nextCarsSearchCount).toHaveBeenCalledTimes(3);
      expect(sendWhatsAppSticker).toHaveBeenCalledExactlyOnceWith(FROM, 'media.surprise');
      expect(sendWhatsAppButtons).not.toHaveBeenCalled();
      expect(repo.recordSearchEvent).toHaveBeenLastCalledWith(expect.objectContaining({ matchedStickerIds: [surprise._id], nextOffset: 1 }));
    });

    it('should select the surprise once for three overlapping searches', async () => {
      const regular = sticker({ mediaId: 'media.regular', mediaUploadedAt: new Date() });
      const surprise = sticker({ mediaId: 'media.surprise', mediaUploadedAt: new Date() });
      vi.mocked(repo.searchStickers).mockResolvedValue([regular]);
      vi.mocked(repo.findStickerById).mockResolvedValue(surprise);
      await Promise.all([text('מכוניות'), text('מכוניות'), text('מכוניות')]);
      expect(vi.mocked(sendWhatsAppSticker).mock.calls.filter(([, mediaId]) => mediaId === 'media.surprise')).toHaveLength(1);
      expect(vi.mocked(sendWhatsAppSticker).mock.calls.filter(([, mediaId]) => mediaId === 'media.regular')).toHaveLength(2);
    });

    it('should exclude other searches and quote-reply tag edits from the count', async () => {
      await text('מכוניות');
      await text('חתול');
      await text('מכוניות אדומות');
      await text('מכוניות!');
      vi.mocked(repo.findStickerByMessageId).mockResolvedValueOnce(sticker());
      await text('מכוניות', 'wamid.in');
      await text('מכוניות');
      expect(repo.nextCarsSearchCount).toHaveBeenCalledTimes(2);
      expect(repo.findStickerById).not.toHaveBeenCalled();
      await text('מכוניות');
      expect(repo.findStickerById).toHaveBeenCalledTimes(1);
    });

    test.each(['', 'REPLACE_WITH_STICKER_ID'])('should keep normal searches while the sticker id is "%s"', async (id) => {
      carsConfig.stickerId = id;
      for (let i = 0; i < 3; i++) await text('מכוניות');
      expect(repo.nextCarsSearchCount).not.toHaveBeenCalled();
      expect(repo.findStickerById).not.toHaveBeenCalled();
      expect(repo.searchStickers).toHaveBeenCalledTimes(3);
    });

    it('should use normal results if the configured sticker has been deleted', async () => {
      vi.mocked(repo.findStickerById).mockResolvedValueOnce(null);
      for (let i = 0; i < 3; i++) await text('מכוניות');
      expect(repo.findStickerById).toHaveBeenCalledTimes(1);
      expect(repo.searchStickers).toHaveBeenCalledTimes(3);
    });

    afterEach(() => {
      vi.mocked(repo.searchStickers).mockResolvedValue([]);
      vi.mocked(repo.findStickerById).mockResolvedValue(null);
      vi.mocked(repo.nextCarsSearchCount).mockResolvedValue(1);
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
        matchedStickerIds: matches.map((m) => m._id),
        nextOffset: 2,
        sentStickerIds: matches.map((m) => m._id),
        failedCount: 0,
        rateLimited: false,
        durationMs: expect.any(Number),
      });
    });

    it('should record a search with no results', async () => {
      await text('dog');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ words: ['dog'], matchedCount: 0, matchedStickerIds: [], nextOffset: 0, sentStickerIds: [] }));
    });

    it('should record failed sends and the pair rate limit', async () => {
      const matches = [sticker({ byteSize: undefined }), sticker(), sticker()];
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(matches);
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(null);
      vi.mocked(sendWhatsAppSticker).mockResolvedValueOnce('wamid.1').mockRejectedValueOnce({ code: 131056 }).mockRejectedValueOnce({ code: 131056 });
      await text('cat');
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ sentStickerIds: [matches[1]._id], failedCount: 1, rateLimited: true, nextOffset: 2 }));
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

  describe('paging', () => {
    const MORE = 'עוד ⬇️';

    it('should send the first page 1s apart, then offer the rest with a button', async () => {
      const matches = stickers(STICKER_PAGE_SIZE + 2);
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(matches);
      await text('cat');
      expect(vi.mocked(sendWhatsAppSticker)).toHaveBeenCalledTimes(STICKER_PAGE_SIZE);
      expect(vi.mocked(sleep).mock.calls.map(([ms]) => ms)).toEqual(Array(STICKER_PAGE_SIZE - 1).fill(STICKER_SEND_DELAY_MS));
      expect(repo.recordSearchEvent).toHaveBeenCalledWith(expect.objectContaining({ matchedCount: matches.length, matchedStickerIds: matches.map((m) => m._id), nextOffset: STICKER_PAGE_SIZE }));
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, 'יש עוד 2 סטיקרים.', [{ id: `more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`, title: MORE }]);
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should not offer more when everything fits in one page', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(stickers(STICKER_PAGE_SIZE));
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(STICKER_PAGE_SIZE);
      expect(sendWhatsAppButtons).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });

    it('should mention failed stickers next to the button', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce([sticker({ byteSize: undefined }), ...stickers(STICKER_PAGE_SIZE)]);
      vi.mocked(fitStickerToLimit).mockResolvedValueOnce(null);
      await text('cat');
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, 'מצטער, 1 סטיקרים לא נשלחו.\nיש עוד 1 סטיקרים.', expect.any(Array));
    });

    it('should send the first page without a button when the search could not be stored', async () => {
      vi.mocked(repo.searchStickers).mockResolvedValueOnce(stickers(STICKER_PAGE_SIZE + 1));
      vi.mocked(repo.recordSearchEvent).mockRejectedValueOnce(new Error('mongo down'));
      await text('cat');
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(STICKER_PAGE_SIZE);
      expect(sendWhatsAppButtons).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('משהו השתבש'));
    });

    it('should send the next page on "עוד" and offer the rest', async () => {
      const matches = stickers(STICKER_PAGE_SIZE * 2 + 2);
      const ids = matches.map((m) => m._id);
      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(SEARCH_ID);
      vi.mocked(repo.claimSearchPage).mockResolvedValueOnce(search(ids, STICKER_PAGE_SIZE * 2));
      vi.mocked(repo.findStickersByIds).mockResolvedValueOnce(matches.slice(STICKER_PAGE_SIZE, STICKER_PAGE_SIZE * 2));
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(repo.claimSearchPage).toHaveBeenCalledWith(SEARCH_ID, FROM, STICKER_PAGE_SIZE, STICKER_PAGE_SIZE * 2);
      expect(repo.findStickersByIds).toHaveBeenCalledWith(ids.slice(STICKER_PAGE_SIZE, STICKER_PAGE_SIZE * 2));
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(STICKER_PAGE_SIZE);
      expect(repo.recordSearchPage).toHaveBeenCalledWith(SEARCH_ID, {
        nextOffset: STICKER_PAGE_SIZE * 2,
        sentIds: ids.slice(STICKER_PAGE_SIZE, STICKER_PAGE_SIZE * 2),
        failed: 0,
        rateLimited: false,
      });
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, 'יש עוד 2 סטיקרים.', [{ id: `more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE * 2}`, title: MORE }]);
      expect(repo.searchStickers).not.toHaveBeenCalled();
      expect(repo.recordSearchEvent).not.toHaveBeenCalled();
    });

    it('should say when the last page was sent', async () => {
      const matches = stickers(STICKER_PAGE_SIZE + 2);
      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(SEARCH_ID);
      vi.mocked(repo.claimSearchPage).mockResolvedValueOnce(
        search(
          matches.map((m) => m._id),
          STICKER_PAGE_SIZE * 2,
        ),
      );
      vi.mocked(repo.findStickersByIds).mockResolvedValueOnce(matches.slice(STICKER_PAGE_SIZE));
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(sendWhatsAppSticker).toHaveBeenCalledTimes(2);
      expect(repo.recordSearchPage).toHaveBeenCalledWith(SEARCH_ID, expect.objectContaining({ nextOffset: matches.length }));
      expect(sendWhatsAppButtons).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'זה הכול ✅');
    });

    it('should continue from the sticker the rate limit stopped on', async () => {
      const matches = stickers(STICKER_PAGE_SIZE * 2);
      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(SEARCH_ID);
      vi.mocked(repo.claimSearchPage).mockResolvedValueOnce(
        search(
          matches.map((m) => m._id),
          STICKER_PAGE_SIZE * 2,
        ),
      );
      vi.mocked(repo.findStickersByIds).mockResolvedValueOnce(matches.slice(STICKER_PAGE_SIZE));
      vi.mocked(sendWhatsAppSticker).mockResolvedValueOnce('wamid.1').mockRejectedValueOnce({ code: 131056 }).mockRejectedValueOnce({ code: 131056 });
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(repo.recordSearchPage).toHaveBeenCalledWith(SEARCH_ID, expect.objectContaining({ nextOffset: STICKER_PAGE_SIZE + 1, rateLimited: true }));
      expect(sendWhatsAppButtons).toHaveBeenCalledWith(FROM, expect.stringContaining('חכו כמה שניות'), [{ id: `more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE + 1}`, title: MORE }]);
    });

    it('should not resend anything from a search that a newer search replaced', async () => {
      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(new ObjectId());
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(repo.claimSearchPage).not.toHaveBeenCalled();
      expect(sendWhatsAppSticker).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('הכפתור הזה כבר לא פעיל'));
    });

    it('should not resend a page when the button was already used', async () => {
      vi.mocked(repo.getLatestSearchId).mockResolvedValueOnce(SEARCH_ID);
      await tap(`more:${SEARCH_ID_HEX}:${STICKER_PAGE_SIZE}`);
      expect(repo.claimSearchPage).toHaveBeenCalled();
      expect(sendWhatsAppSticker).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('הכפתור הזה כבר לא פעיל'));
    });

    it('should ignore unknown buttons', async () => {
      await tap('something-else');
      expect(repo.getLatestSearchId).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).not.toHaveBeenCalled();
    });
  });

  describe('stats', () => {
    it('should reply to "%" with the top tags, searched words and searchers', async () => {
      vi.mocked(repo.getTopStickerTags).mockResolvedValueOnce([
        { value: 'חתול', count: 12 },
        { value: '😂', count: 7 },
      ]);
      vi.mocked(repo.getTopSearchWords).mockResolvedValueOnce([{ value: 'כלב', count: 4 }]);
      vi.mocked(repo.getTopSearchers).mockResolvedValueOnce([
        { value: '972501231234', count: 30 },
        { value: '972509876543', count: 2 },
      ]);
      await text(' % ');
      expect(repo.getTopStickerTags).toHaveBeenCalledWith(5);
      expect(repo.getTopSearchWords).toHaveBeenCalledWith(5);
      expect(repo.getTopSearchers).toHaveBeenCalledWith(3);
      expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);
      const message = vi.mocked(sendWhatsAppMessage).mock.calls[0][1];
      expect(message).toContain('📊 *סטטיסטיקות*');
      expect(message).toContain('1. חתול (12)\n2. 😂 (7)');
      expect(message).toContain('1. כלב (4)');
      expect(message).toContain('1. 972501231234 — 30 חיפושים\n2. 972509876543 — 2 חיפושים');
    });

    it('should not search, log a search or tag on "%"', async () => {
      await text('%');
      await text('%', 'wamid.in');
      expect(repo.searchStickers).not.toHaveBeenCalled();
      expect(repo.recordSearchEvent).not.toHaveBeenCalled();
      expect(repo.findStickerByMessageId).not.toHaveBeenCalled();
      expect(repo.addStickerTags).not.toHaveBeenCalled();
      expect(repo.removeStickerTags).not.toHaveBeenCalled();
    });

    it('should fall back gracefully when there is no data yet', async () => {
      await text('%');
      const message = vi.mocked(sendWhatsAppMessage).mock.calls[0][1];
      expect(message).toContain('אין עדיין מילות חיפוש.');
      expect(message).toContain('אין עדיין חיפושים.');
      expect(message).toContain('אין עדיין מחפשים.');
    });

    it('should tell the user in Hebrew when loading the stats fails', async () => {
      vi.mocked(repo.getTopSearchers).mockRejectedValueOnce(new Error('mongo down'));
      await expect(text('%')).resolves.toBeUndefined();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, 'משהו השתבש 😕 נסו שוב מאוחר יותר.');
    });
  });
});
