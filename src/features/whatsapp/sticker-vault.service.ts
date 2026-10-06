import type { ObjectId } from 'mongodb';
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
import { STICKER_MEDIA_REUSE_MS, STICKER_SEARCH_LIMIT, STICKER_SEND_DELAY_MS } from './constants';
import {
  addStickerMessageId,
  addStickerTags,
  createSticker,
  deleteSticker,
  findStickerByMessageId,
  findStickerBySha,
  getStickerData,
  markStickerReceived,
  recordSearchEvent,
  removeStickerTags,
  replaceStickerData,
  searchStickers,
  setStickerMedia,
} from './mongo';
import type { CreateSearchEventData } from './mongo';
import { fitStickerToLimit, getStickerByteLimit } from './sticker-image';
import type { IncomingMessage, IncomingStickerMessage, IncomingTextMessage, StickerSummary } from './types';
import { createStepTimer, parseTagEdits, tokenize } from './whatsapp.utils';
import type { StepTimer, TagEdits } from './whatsapp.utils';

const logger = new Logger('whatsapp:sticker-vault');

const DELETE_COMMANDS = ['delete', 'מחק', '-'];

const HELP_MESSAGE = [
  '🗂️ *מאגר הסטיקרים*',
  '• שלחו לי סטיקר כדי לשמור אותו. המאגר משותף לכל מי שמשתמש בבוט.',
  '• הגיבו לסטיקר עם מילים כדי להוסיף לו מילות חיפוש.',
  '• מילה עם "-" בהתחלה או בסוף (למשל -לילה) מסירה את מילת החיפוש.',
  '• שלחו מילים כדי לקבל סטיקרים שמתאימים לכולן.',
  '• הגיבו *מחק* או *-* לסטיקר כדי למחוק אותו.',
].join('\n');

const ADD_WORDS_HINT = 'הגיבו לסטיקר עם מילים כדי להוסיף מילות חיפוש.';
const NO_WORDS_MESSAGE = `אין עדיין מילות חיפוש. ${ADD_WORDS_HINT}`;
const RATE_LIMIT_MESSAGE = 'שלחתי הרבה הודעות ברצף, נסו שוב בעוד כמה שניות.';

function formatTags(tags: string[], emptyText = NO_WORDS_MESSAGE): string {
  return tags.length ? `🔎 מילות חיפוש: ${tags.join(', ')}` : emptyText;
}

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  void sendWhatsAppTypingIndicator(message.id);
  const timer = createStepTimer();
  try {
    if (message.kind === 'sticker') await handleSticker(message, timer);
    else await handleText(message, timer);
  } finally {
    // Meta's timestamp has 1s precision; a large gap points at webhook delivery or a cold start, not our code.
    const sinceSentMs = message.sentAt ? Date.now() - message.sentAt : null;
    logger.log(`Timing for ${message.kind} ${message.id}: ${timer.summary()}${sinceSentMs === null ? '' : ` sinceSent≈${sinceSentMs}ms`}`);
  }
}

async function handleSticker({ from, id, mediaId, animated }: IncomingStickerMessage, timer: StepTimer): Promise<void> {
  const { data, mimeType } = await timer.time('download', () => downloadWhatsAppMedia(mediaId));
  const sha256 = createHash('sha256').update(data).digest('hex');

  const existing = await timer.time('findSha', () => findStickerBySha(sha256));
  if (existing) {
    await timer.time('markReceived', () => markStickerReceived(existing._id, id));
    await timer.time('reply', () => sendWhatsAppMessage(from, `קיים 👍\n${formatTags(existing.tags)}`));
    return;
  }

  // sha256 stays on the original bytes so re-sends of the same sticker still dedupe.
  const fitted = await timer.time('fit', () => fitStickerToLimit(data, animated));
  if (!fitted) {
    logger.warn(`Sticker ${sha256.slice(0, 12)} from ${from} is too large to resend (${data.length} bytes, animated=${animated})`);
    await timer.time('reply', () => sendWhatsAppMessage(from, 'הסטיקר גדול מדי בשביל וואטסאפ, אז לא שמרתי אותו.'));
    return;
  }

  try {
    await timer.time('create', () => createSticker({ ownerPhone: from, sha256, data: fitted, mimeType: fitted === data ? mimeType : 'image/webp', animated, messageId: id }));
  } catch (err) {
    // Two deliveries of the same sticker raced past the lookup; the unique index kept one.
    if ((err as { code?: number })?.code === 11000) return;
    throw err;
  }
  const sizeNote = fitted === data ? `${data.length} bytes` : `${data.length} → ${fitted.length} bytes`;
  logger.log(`Saved sticker ${sha256.slice(0, 12)} for ${from} (${sizeNote}, animated=${animated})`);
  await timer.time('reply', () => sendWhatsAppMessage(from, `נשמר ✅\n${ADD_WORDS_HINT}`));
}

async function handleText({ from, text, contextId }: IncomingTextMessage, timer: StepTimer): Promise<void> {
  const command = text.trim().toLowerCase();
  const words = tokenize(text);

  if (contextId) {
    const quoted = await timer.time('findQuoted', () => findStickerByMessageId(contextId));
    if (quoted) {
      if (DELETE_COMMANDS.includes(command)) {
        await timer.time('delete', () => deleteSticker(quoted._id));
        await timer.time('reply', () => sendWhatsAppMessage(from, 'נמחק 🗑️'));
        return;
      }
      await editStickerTags(from, quoted, parseTagEdits(text), timer);
      return;
    }
  }

  if (!words.length) {
    await timer.time('reply', () => sendWhatsAppMessage(from, HELP_MESSAGE));
    return;
  }

  // One extra result tells us whether there are more matches than we send.
  const matches = await timer.time('search', () => searchStickers(words, STICKER_SEARCH_LIMIT + 1));
  const hasMore = matches.length > STICKER_SEARCH_LIMIT;
  let result: SendResult = { sentIds: [], failed: 0, rateLimited: false };
  if (!matches.length) {
    await timer.time('reply', () => sendWhatsAppMessage(from, `לא נמצאו סטיקרים עבור "${words.join(' ')}".`));
  } else {
    result = await sendStickers(from, matches.slice(0, STICKER_SEARCH_LIMIT), timer);
    if (!result.rateLimited && hasMore) await timer.time('reply', () => sendWhatsAppMessage(from, 'יש עוד סטיקרים שמתאימים. הוסיפו מילים כדי לדייק את החיפוש.'));
  }

  const event: CreateSearchEventData = {
    phone: from,
    query: text,
    words,
    matchedCount: matches.length,
    hasMore,
    sentStickerIds: result.sentIds,
    failedCount: result.failed,
    rateLimited: result.rateLimited,
    durationMs: timer.elapsedMs(),
  };
  // Metrics must never break or slow down a search.
  void recordSearchEvent(event).catch((err) => logger.error(`Failed to record search event: ${getErrorMessage(err)}`));
}

type SendResult = {
  readonly sentIds: ObjectId[];
  readonly failed: number;
  readonly rateLimited: boolean; // stopped early because of Meta's per-user rate limit
};

async function sendStickers(to: string, stickers: StickerSummary[], timer: StepTimer): Promise<SendResult> {
  const sentIds: ObjectId[] = [];
  let failed = 0;
  for (const [index, sticker] of stickers.entries()) {
    if (index > 0) await timer.time('delay', () => sleep(STICKER_SEND_DELAY_MS));
    try {
      await sendStoredSticker(to, sticker, timer);
      sentIds.push(sticker._id);
    } catch (err) {
      if (isWhatsAppPairRateLimitError(err)) {
        logger.warn(`Pair rate limit hit while sending to ${to}, stopping after ${index} of ${stickers.length}`);
        await timer.time('reply', () => sendWhatsAppMessage(to, RATE_LIMIT_MESSAGE));
        return { sentIds, failed, rateLimited: true };
      }
      failed++;
      logger.error(`Failed to send sticker ${sticker._id} to ${to}: ${describeWhatsAppError(err)}`);
    }
  }
  if (failed) await timer.time('reply', () => sendWhatsAppMessage(to, failed === stickers.length ? 'מצטער, לא הצלחתי לשלוח את הסטיקר.' : `מצטער, ${failed} מתוך ${stickers.length} סטיקרים לא נשלחו.`));
  return { sentIds, failed, rateLimited: false };
}

async function editStickerTags(from: string, sticker: StickerSummary, { add, remove }: TagEdits, timer: StepTimer): Promise<void> {
  if (!add.length && !remove.length) {
    await timer.time('reply', () => sendWhatsAppMessage(from, 'הגיבו לסטיקר עם מילים כדי להוסיף מילות חיפוש, *-מילה* כדי להסיר, או *מחק* כדי למחוק אותו.'));
    return;
  }
  let tags = sticker.tags;
  if (add.length) tags = await timer.time('addTags', () => addStickerTags(sticker._id, add));
  if (remove.length) tags = await timer.time('removeTags', () => removeStickerTags(sticker._id, remove));
  await timer.time('reply', () => sendWhatsAppMessage(from, `עודכן ✅\n${formatTags(tags, 'אין מילות חיפוש')}`));
}

async function sendStoredSticker(to: string, sticker: StickerSummary, timer: StepTimer): Promise<void> {
  // Stickers saved before size limits were enforced may be too big; their cached upload would "send" and then silently fail delivery.
  const needsSizeCheck = sticker.byteSize === undefined || sticker.byteSize > getStickerByteLimit(sticker.animated);
  const cachedMediaId = !needsSizeCheck && sticker.mediaId && sticker.mediaUploadedAt && Date.now() - new Date(sticker.mediaUploadedAt).getTime() < STICKER_MEDIA_REUSE_MS ? sticker.mediaId : null;

  let messageId: string | null = null;
  if (cachedMediaId) {
    try {
      messageId = await timer.time('sendCached', () => sendWhatsAppSticker(to, cachedMediaId));
    } catch (err) {
      if (isWhatsAppPairRateLimitError(err)) throw err;
      logger.warn(`Cached media ${cachedMediaId} failed, re-uploading: ${describeWhatsAppError(err)}`);
    }
  }

  if (!messageId) {
    let data = await timer.time('getData', () => getStickerData(sticker._id));
    if (!data) throw new Error(`Sticker ${sticker._id} has no data`);
    if (needsSizeCheck) {
      const original = data;
      const fitted = await timer.time('fit', () => fitStickerToLimit(original, sticker.animated));
      if (!fitted) throw new Error(`Sticker ${sticker._id} is too large to send (${data.length} bytes)`);
      if (fitted !== data || sticker.byteSize === undefined) {
        if (fitted !== data) logger.log(`Re-encoded stored sticker ${sticker._id}: ${data.length} → ${fitted.length} bytes`);
        await timer.time('replaceData', () => replaceStickerData(sticker._id, fitted));
      }
      data = fitted;
    }
    const upload = data;
    const mediaId = await timer.time('upload', () => uploadWhatsAppMedia(upload, sticker.mimeType || 'image/webp', 'sticker.webp'));
    await timer.time('setMedia', () => setStickerMedia(sticker._id, mediaId));
    messageId = await timer.time('send', () => sendWhatsAppSticker(to, mediaId));
  }

  if (messageId) {
    const sentId = messageId;
    await timer.time('recordId', () => addStickerMessageId(sticker._id, sentId)).catch((err) => logger.error(`Failed to record sent sticker id: ${getErrorMessage(err)}`));
  }
}
