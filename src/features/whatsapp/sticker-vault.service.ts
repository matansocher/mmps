import { createHash } from 'node:crypto';
import { getErrorMessage, Logger } from '@core/utils';
import { describeWhatsAppError, downloadWhatsAppMedia, sendWhatsAppMessage, sendWhatsAppSticker, uploadWhatsAppMedia } from '@services/whatsapp';
import { STICKER_MEDIA_REUSE_MS, STICKER_SEARCH_LIMIT, STICKER_TAG_WINDOW_MS } from './constants';
import {
  addStickerMessageId,
  addStickerTags,
  countStickers,
  createSticker,
  deleteSticker,
  findRecentUntaggedSticker,
  findStickerByMessageId,
  findStickerBySha,
  getRandomSticker,
  getStickerData,
  markStickerReceived,
  replaceStickerData,
  searchStickers,
  setStickerMedia,
} from './mongo';
import { fitStickerToLimit, getStickerByteLimit } from './sticker-image';
import type { IncomingMessage, IncomingStickerMessage, IncomingTextMessage, StickerSummary } from './types';
import { tokenize } from './whatsapp.utils';

const logger = new Logger('whatsapp:sticker-vault');

const HELP_MESSAGE = [
  '🗂️ *Sticker vault*',
  '• Send me a sticker to save it. The vault is shared by everyone who uses this bot.',
  '• Then send a few words to tag it (within 5 minutes), or reply to any sticker with words to add tags.',
  '• Send words to get matching stickers back.',
  '• *random* sends a random sticker.',
  '• Reply *delete* to a sticker you saved to remove it.',
].join('\n');

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  if (message.kind === 'sticker') return handleSticker(message);
  return handleText(message);
}

async function handleSticker({ from, id, mediaId, animated }: IncomingStickerMessage): Promise<void> {
  const { data, mimeType } = await downloadWhatsAppMedia(mediaId);
  const sha256 = createHash('sha256').update(data).digest('hex');

  const existing = await findStickerBySha(sha256);
  if (existing) {
    await markStickerReceived(existing._id, id, from);
    const reply = existing.tags.length ? `Already saved 🏷️ ${existing.tags.join(', ')}` : 'Already saved, but it has no tags yet. Send a few words to tag it.';
    await sendWhatsAppMessage(from, reply);
    return;
  }

  // sha256 stays on the original bytes so re-sends of the same sticker still dedupe.
  const fitted = await fitStickerToLimit(data, animated);
  if (!fitted) {
    logger.warn(`Sticker ${sha256.slice(0, 12)} from ${from} is too large to resend (${data.length} bytes, animated=${animated})`);
    await sendWhatsAppMessage(from, "This sticker is too large for WhatsApp to send back, so I didn't save it.");
    return;
  }

  try {
    await createSticker({ ownerPhone: from, sha256, data: fitted, mimeType: fitted === data ? mimeType : 'image/webp', animated, messageId: id });
  } catch (err) {
    // Two deliveries of the same sticker raced past the lookup; the unique index kept one.
    if ((err as { code?: number })?.code === 11000) return;
    throw err;
  }
  const sizeNote = fitted === data ? `${data.length} bytes` : `${data.length} → ${fitted.length} bytes`;
  logger.log(`Saved sticker ${sha256.slice(0, 12)} for ${from} (${sizeNote}, animated=${animated})`);
  await sendWhatsAppMessage(from, 'Saved ✅ Send a few words to tag it, or reply to it anytime to add tags.');
}

async function handleText({ from, text, contextId }: IncomingTextMessage): Promise<void> {
  const command = text.trim().toLowerCase();
  const words = tokenize(text);

  if (contextId) {
    const quoted = await findStickerByMessageId(contextId);
    if (quoted) {
      if (command === 'delete') {
        if (quoted.ownerPhone !== from) {
          await sendWhatsAppMessage(from, 'Only the person who saved this sticker can delete it.');
          return;
        }
        await deleteSticker(quoted._id);
        await sendWhatsAppMessage(from, 'Deleted 🗑️');
        return;
      }
      await tagSticker(from, quoted, words);
      return;
    }
  }

  if (command === 'help') {
    const count = await countStickers();
    await sendWhatsAppMessage(from, `${HELP_MESSAGE}\n\nThe vault has ${count} sticker${count === 1 ? '' : 's'}.`);
    return;
  }

  if (command === 'random') {
    const sticker = await getRandomSticker();
    if (!sticker) {
      await sendWhatsAppMessage(from, 'The vault is empty. Send me a sticker to save it.');
      return;
    }
    await sendStickers(from, [sticker]);
    return;
  }

  if (!words.length) {
    await sendWhatsAppMessage(from, HELP_MESSAGE);
    return;
  }

  const pending = await findRecentUntaggedSticker(from, new Date(Date.now() - STICKER_TAG_WINDOW_MS));
  if (pending) {
    await tagSticker(from, pending, words);
    return;
  }

  const matches = await searchStickers(words, STICKER_SEARCH_LIMIT);
  if (!matches.length) {
    await sendWhatsAppMessage(from, `No stickers match "${words.join(' ')}". Send *help* to see how tagging works.`);
    return;
  }
  await sendStickers(from, matches);
}

async function sendStickers(to: string, stickers: StickerSummary[]): Promise<void> {
  let failed = 0;
  for (const sticker of stickers) {
    try {
      await sendStoredSticker(to, sticker);
    } catch (err) {
      failed++;
      logger.error(`Failed to send sticker ${sticker._id} to ${to}: ${describeWhatsAppError(err)}`);
    }
  }
  if (failed) await sendWhatsAppMessage(to, failed === stickers.length ? "Sorry, I couldn't send that sticker." : `Sorry, ${failed} of ${stickers.length} stickers couldn't be sent.`);
}

async function tagSticker(from: string, sticker: StickerSummary, words: string[]): Promise<void> {
  if (!words.length) {
    await sendWhatsAppMessage(from, 'Reply with words to tag this sticker, or *delete* to remove it.');
    return;
  }
  const tags = await addStickerTags(sticker._id, words);
  await sendWhatsAppMessage(from, `Tagged 🏷️ ${tags.join(', ')}`);
}

async function sendStoredSticker(to: string, sticker: StickerSummary): Promise<void> {
  // Stickers saved before size limits were enforced may be too big; their cached upload would "send" and then silently fail delivery.
  const needsSizeCheck = sticker.byteSize === undefined || sticker.byteSize > getStickerByteLimit(sticker.animated);
  const cachedMediaId = !needsSizeCheck && sticker.mediaId && sticker.mediaUploadedAt && Date.now() - new Date(sticker.mediaUploadedAt).getTime() < STICKER_MEDIA_REUSE_MS ? sticker.mediaId : null;

  let messageId: string | null = null;
  if (cachedMediaId) {
    try {
      messageId = await sendWhatsAppSticker(to, cachedMediaId);
    } catch (err) {
      logger.warn(`Cached media ${cachedMediaId} failed, re-uploading: ${describeWhatsAppError(err)}`);
    }
  }

  if (!messageId) {
    let data = await getStickerData(sticker._id);
    if (!data) throw new Error(`Sticker ${sticker._id} has no data`);
    if (needsSizeCheck) {
      const fitted = await fitStickerToLimit(data, sticker.animated);
      if (!fitted) throw new Error(`Sticker ${sticker._id} is too large to send (${data.length} bytes)`);
      if (fitted !== data || sticker.byteSize === undefined) {
        if (fitted !== data) logger.log(`Re-encoded stored sticker ${sticker._id}: ${data.length} → ${fitted.length} bytes`);
        await replaceStickerData(sticker._id, fitted);
      }
      data = fitted;
    }
    const mediaId = await uploadWhatsAppMedia(data, sticker.mimeType || 'image/webp', 'sticker.webp');
    await setStickerMedia(sticker._id, mediaId);
    messageId = await sendWhatsAppSticker(to, mediaId);
  }

  if (messageId) await addStickerMessageId(sticker._id, messageId).catch((err) => logger.error(`Failed to record sent sticker id: ${getErrorMessage(err)}`));
}
