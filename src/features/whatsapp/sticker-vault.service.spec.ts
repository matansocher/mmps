import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { downloadWhatsAppMedia, sendWhatsAppMessage, sendWhatsAppSticker, uploadWhatsAppMedia } from '@services/whatsapp';
import * as repo from './mongo';
import { fitStickerToLimit } from './sticker-image';
import { handleIncomingMessage } from './sticker-vault.service';
import type { StickerSummary } from './types';

vi.mock('@services/whatsapp', () => ({
  describeWhatsAppError: vi.fn(() => 'error'),
  downloadWhatsAppMedia: vi.fn(),
  sendWhatsAppMessage: vi.fn(async () => undefined),
  sendWhatsAppSticker: vi.fn(async () => 'wamid.sent'),
  uploadWhatsAppMedia: vi.fn(async () => 'media.new'),
}));

vi.mock('./mongo', () => ({
  addStickerMessageId: vi.fn(async () => undefined),
  addStickerTags: vi.fn(async (_id, tags: string[]) => tags),
  countStickers: vi.fn(async () => 0),
  createSticker: vi.fn(async () => undefined),
  deleteSticker: vi.fn(async () => undefined),
  findRecentUntaggedSticker: vi.fn(async () => null),
  findStickerByMessageId: vi.fn(async () => null),
  findStickerBySha: vi.fn(async () => null),
  getRandomSticker: vi.fn(async () => null),
  getStickerData: vi.fn(async () => Buffer.from('webp')),
  markStickerReceived: vi.fn(async () => undefined),
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
  lastReceivedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
const text = (body: string, contextId?: string) => handleIncomingMessage({ kind: 'text', from: FROM, id: 'wamid.text', text: body, ...(contextId && { contextId }) });

describe('handleIncomingMessage()', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('stickers', () => {
    const data = Buffer.from('sticker-bytes');
    const sha256 = createHash('sha256').update(data).digest('hex');

    beforeEach(() => vi.mocked(downloadWhatsAppMedia).mockResolvedValue({ data, mimeType: 'image/webp' }));

    it('should save a new sticker keyed by its content hash', async () => {
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.in', mediaId: 'm1', animated: true });
      expect(repo.createSticker).toHaveBeenCalledWith({ ownerPhone: FROM, sha256, data, mimeType: 'image/webp', animated: true, messageId: 'wamid.in' });
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('Saved'));
    });

    it('should not duplicate a sticker that is already saved', async () => {
      const existing = sticker({ tags: ['cat'] });
      vi.mocked(repo.findStickerBySha).mockResolvedValueOnce(existing);
      await handleIncomingMessage({ kind: 'sticker', from: FROM, id: 'wamid.again', mediaId: 'm1', animated: false });
      expect(repo.createSticker).not.toHaveBeenCalled();
      expect(repo.markStickerReceived).toHaveBeenCalledWith(existing._id, 'wamid.again');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('cat'));
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
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('too large'));
    });
  });

  describe('text', () => {
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
      expect(repo.deleteSticker).toHaveBeenCalledWith(quoted._id);
      expect(repo.addStickerTags).not.toHaveBeenCalled();
    });

    it('should tag the recently received untagged sticker', async () => {
      const recent = sticker();
      vi.mocked(repo.findRecentUntaggedSticker).mockResolvedValueOnce(recent);
      await text('cat');
      expect(repo.addStickerTags).toHaveBeenCalledWith(recent._id, ['cat']);
      expect(repo.searchStickers).not.toHaveBeenCalled();
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
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('1 of 2'));
    });

    it('should say when nothing matches', async () => {
      await text('dog');
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('No stickers match'));
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
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(FROM, expect.stringContaining('You have 3 saved stickers'));
    });
  });
});
