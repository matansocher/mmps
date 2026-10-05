import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { downloadWhatsAppMedia, sendWhatsAppMessage, sendWhatsAppSticker, uploadWhatsAppMedia } from '@services/whatsapp';
import * as repo from './mongo';
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
  searchStickers: vi.fn(async () => []),
  setStickerMedia: vi.fn(async () => undefined),
}));

const FROM = '972500000000';
const sticker = (overrides: Partial<StickerSummary> = {}): StickerSummary => ({
  _id: new ObjectId(),
  ownerPhone: FROM,
  sha256: 'abc',
  mimeType: 'image/webp',
  animated: false,
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
