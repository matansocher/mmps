import { createHash } from 'node:crypto';
import { getErrorMessage, Logger, sleep } from '@core/utils';
import {
  describeWhatsAppError,
  downloadWhatsAppMedia,
  isWhatsAppPairRateLimitError,
  sendWhatsAppMessage,
  sendWhatsAppSticker,
  sendWhatsAppTypingIndicator,
  uploadWhatsAppMedia,
} from '@services/whatsapp';
import { STICKER_MEDIA_REUSE_MS, STICKER_SEARCH_LIMIT, STICKER_SEND_DELAY_MS, STICKER_TAG_WINDOW_MS } from './constants';
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
  removeStickerTags,
  replaceStickerData,
  searchStickers,
  setStickerMedia,
} from './mongo';
import { fitStickerToLimit, getStickerByteLimit } from './sticker-image';
import type { IncomingMessage, IncomingStickerMessage, IncomingTextMessage, StickerSummary } from './types';
import { parseTagEdits, tokenize } from './whatsapp.utils';
import type { TagEdits } from './whatsapp.utils';

const logger = new Logger('whatsapp:sticker-vault');

const HELP_COMMANDS = ['help', 'עזרה'];
const RANDOM_COMMANDS = ['random', 'אקראי'];
const DELETE_COMMANDS = ['delete', 'מחק', '-'];

const HELP_MESSAGE = [
  '🗂️ *מאגר הסטיקרים*',
  '• שלחו לי סטיקר כדי לשמור אותו. המאגר משותף לכל מי שמשתמש בבוט.',
  '• אחר כך שלחו כמה מילים כדי לתייג אותו (תוך 5 דקות), או הגיבו לכל סטיקר עם מילים כדי להוסיף תגיות.',
  '• מילה עם "-" בהתחלה או בסוף (למשל -לילה) מסירה את התגית.',
  '• שלחו מילים כדי לקבל סטיקרים שמתויגים בכולן.',
  '• *אקראי* שולח סטיקר אקראי.',
  '• הגיבו *מחק* או *-* לסטיקר ששמרתם כדי למחוק אותו.',
].join('\n');

const NO_TAGS_MESSAGE = 'אין עדיין תגיות. ההודעה הבאה שתשלחו תתייג אותו.';
const RATE_LIMIT_MESSAGE = 'שלחתי הרבה הודעות ברצף, נסו שוב בעוד כמה שניות.';

function formatTags(tags: string[], emptyText = NO_TAGS_MESSAGE): string {
  return tags.length ? `🏷️ תגיות: ${tags.join(', ')}` : emptyText;
}

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  void sendWhatsAppTypingIndicator(message.id);
  if (message.kind === 'sticker') return handleSticker(message);
  return handleText(message);
}

async function handleSticker({ from, id, mediaId, animated }: IncomingStickerMessage): Promise<void> {
  const { data, mimeType } = await downloadWhatsAppMedia(mediaId);
  const sha256 = createHash('sha256').update(data).digest('hex');

  const existing = await findStickerBySha(sha256);
  if (existing) {
    await markStickerReceived(existing._id, id, from);
    await sendWhatsAppMessage(from, `כבר קיים במאגר\n${formatTags(existing.tags)}`);
    return;
  }

  // sha256 stays on the original bytes so re-sends of the same sticker still dedupe.
  const fitted = await fitStickerToLimit(data, animated);
  if (!fitted) {
    logger.warn(`Sticker ${sha256.slice(0, 12)} from ${from} is too large to resend (${data.length} bytes, animated=${animated})`);
    await sendWhatsAppMessage(from, 'הסטיקר גדול מדי בשביל וואטסאפ, אז לא שמרתי אותו.');
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
  await sendWhatsAppMessage(from, `נשמר ✅\n${NO_TAGS_MESSAGE}`);
}

async function handleText({ from, text, contextId }: IncomingTextMessage): Promise<void> {
  const command = text.trim().toLowerCase();
  const words = tokenize(text);

  if (contextId) {
    const quoted = await findStickerByMessageId(contextId);
    if (quoted) {
      if (DELETE_COMMANDS.includes(command)) {
        if (quoted.ownerPhone !== from) {
          await sendWhatsAppMessage(from, 'רק מי ששמר את הסטיקר יכול למחוק אותו.');
          return;
        }
        await deleteSticker(quoted._id);
        await sendWhatsAppMessage(from, 'נמחק 🗑️');
        return;
      }
      await editStickerTags(from, quoted, parseTagEdits(text));
      return;
    }
  }

  if (HELP_COMMANDS.includes(command)) {
    const count = await countStickers();
    await sendWhatsAppMessage(from, `${HELP_MESSAGE}\n\nבמאגר יש ${count === 1 ? 'סטיקר אחד' : `${count} סטיקרים`}.`);
    return;
  }

  if (RANDOM_COMMANDS.includes(command)) {
    const sticker = await getRandomSticker();
    if (!sticker) {
      await sendWhatsAppMessage(from, 'המאגר ריק. שלחו לי סטיקר כדי לשמור אותו.');
      return;
    }
    await sendStickers(from, [sticker]);
    return;
  }

  if (!words.length) {
    await sendWhatsAppMessage(from, HELP_MESSAGE);
    return;
  }

  const edits = parseTagEdits(text);
  if (edits.add.length) {
    const pending = await findRecentUntaggedSticker(from, new Date(Date.now() - STICKER_TAG_WINDOW_MS));
    if (pending) {
      await editStickerTags(from, pending, edits);
      return;
    }
  }

  // One extra result tells us whether there are more matches than we send.
  const matches = await searchStickers(words, STICKER_SEARCH_LIMIT + 1);
  if (!matches.length) {
    await sendWhatsAppMessage(from, `לא נמצאו סטיקרים עבור "${words.join(' ')}". שלחו *עזרה* כדי לראות איך מתייגים.`);
    return;
  }
  const hasMore = matches.length > STICKER_SEARCH_LIMIT;
  const sent = await sendStickers(from, matches.slice(0, STICKER_SEARCH_LIMIT));
  if (sent && hasMore) await sendWhatsAppMessage(from, 'יש עוד סטיקרים שמתאימים. הוסיפו מילים כדי לדייק את החיפוש.');
}

// Returns false when sending stopped early because of Meta's per-user rate limit.
async function sendStickers(to: string, stickers: StickerSummary[]): Promise<boolean> {
  let failed = 0;
  for (const [index, sticker] of stickers.entries()) {
    if (index > 0) await sleep(STICKER_SEND_DELAY_MS);
    try {
      await sendStoredSticker(to, sticker);
    } catch (err) {
      if (isWhatsAppPairRateLimitError(err)) {
        logger.warn(`Pair rate limit hit while sending to ${to}, stopping after ${index} of ${stickers.length}`);
        await sendWhatsAppMessage(to, RATE_LIMIT_MESSAGE);
        return false;
      }
      failed++;
      logger.error(`Failed to send sticker ${sticker._id} to ${to}: ${describeWhatsAppError(err)}`);
    }
  }
  if (failed) await sendWhatsAppMessage(to, failed === stickers.length ? 'מצטער, לא הצלחתי לשלוח את הסטיקר.' : `מצטער, ${failed} מתוך ${stickers.length} סטיקרים לא נשלחו.`);
  return true;
}

async function editStickerTags(from: string, sticker: StickerSummary, { add, remove }: TagEdits): Promise<void> {
  if (!add.length && !remove.length) {
    await sendWhatsAppMessage(from, 'הגיבו עם מילים כדי לתייג את הסטיקר, *-מילה* כדי להסיר תגית, או *מחק* כדי למחוק אותו.');
    return;
  }
  let tags = sticker.tags;
  if (add.length) tags = await addStickerTags(sticker._id, add);
  if (remove.length) tags = await removeStickerTags(sticker._id, remove);
  await sendWhatsAppMessage(from, `עודכן ✅\n${formatTags(tags, 'אין תגיות')}`);
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
      if (isWhatsAppPairRateLimitError(err)) throw err;
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
