import { ObjectId } from 'mongodb';
import { createHash } from 'node:crypto';
import { getErrorMessage, Logger, sleep } from '@core/utils';
import {
  describeWhatsAppError,
  downloadWhatsAppMedia,
  isWhatsAppPairRateLimitError,
  sendWhatsAppButtons,
  sendWhatsAppMessage,
  sendWhatsAppSticker,
  sendWhatsAppTypingIndicator,
  uploadWhatsAppMedia,
} from '@services/whatsapp';
import type { IncomingButtonReplyMessage, IncomingMessage, IncomingStickerMessage, IncomingTextMessage } from '@services/whatsapp';
import { STICKER_MEDIA_REUSE_MS, STICKER_PAGE_SIZE, STICKER_RATE_LIMIT_BACKOFF_MS, STICKER_SEND_DELAY_MS } from './constants';
import {
  addStickerMessageId,
  addStickerTags,
  claimSearchPage,
  createSticker,
  deleteSticker,
  findStickerByMessageId,
  findStickerBySha,
  findStickersByIds,
  getLatestSearchId,
  getStickerData,
  getTopSearchers,
  getTopSearchWords,
  getTopStickerTags,
  markStickerReceived,
  recordSearchEvent,
  recordSearchPage,
  removeStickerTags,
  replaceStickerData,
  searchStickers,
  setStickerMedia,
} from './mongo';
import type { CreateSearchEventData } from './mongo';
import { fitStickerToLimit, getStickerByteLimit } from './sticker-image';
import { createStepTimer, formatStatsMessage, parseTagEdits, tokenize } from './stickers.utils';
import type { StepTimer, TagEdits } from './stickers.utils';
import type { StickerSummary } from './types';

const logger = new Logger('stickers:sticker-vault');

const DELETE_COMMANDS = ['delete', 'מחק', '-'];
const STATS_COMMAND = '%';
const STATS_TOP_LIMIT = 5;
const STATS_TOP_SEARCHERS_LIMIT = 3;

const HELP_MESSAGE = [
  '🗂️ *מאגר הסטיקרים*',
  '• שלחו לי סטיקר כדי לשמור אותו. המאגר משותף לכל מי שמשתמש בבוט.',
  '• הגיבו לסטיקר עם מילים כדי להוסיף לו מילות חיפוש.',
  '• מילה עם "-" בהתחלה או בסוף (למשל -לילה) מסירה את מילת החיפוש.',
  '• שלחו מילים כדי לקבל סטיקרים שמתאימים לכולן.',
  `• אם יש הרבה תוצאות, אשלח ${STICKER_PAGE_SIZE} בכל פעם. לחצו *עוד* כדי לקבל את הבאות.`,
  '• הגיבו *מחק* או *-* לסטיקר כדי למחוק אותו.',
  '• שלחו *%* כדי לראות סטטיסטיקות.',
].join('\n');

const ADD_WORDS_HINT = 'הגיבו לסטיקר עם מילים כדי להוסיף מילות חיפוש.';
const NO_WORDS_MESSAGE = `אין עדיין מילות חיפוש. ${ADD_WORDS_HINT}`;
const RATE_LIMIT_MESSAGE = 'שלחתי הרבה הודעות ברצף. חכו כמה שניות ולחצו *עוד* כדי להמשיך.';
const STALE_BUTTON_MESSAGE = 'הכפתור הזה כבר לא פעיל. שלחו את החיפוש שוב כדי להתחיל מההתחלה.';
const MORE_BUTTON_TITLE = 'עוד ⬇️';
const MORE_BUTTON_PATTERN = /^more:([a-f0-9]{24}):(\d+)$/;
const STICKER_ERROR_MESSAGE = 'משהו השתבש ולא הצלחתי לשמור את הסטיקר 😕 נסו שוב מאוחר יותר.';
const TEXT_ERROR_MESSAGE = 'משהו השתבש 😕 נסו שוב מאוחר יותר.';

function formatTags(tags: string[], emptyText = NO_WORDS_MESSAGE): string {
  return tags.length ? `🔎 מילות חיפוש: ${tags.join(', ')}` : emptyText;
}

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  void sendWhatsAppTypingIndicator(message.id);
  const timer = createStepTimer();
  try {
    if (message.kind === 'sticker') await handleSticker(message, timer);
    else if (message.kind === 'button') await handleButton(message, timer);
    else await handleText(message, timer);
  } catch (err) {
    logger.error(`Failed to handle ${message.kind} ${message.id} from ${message.from}: ${describeWhatsAppError(err)}`);
    await sendWhatsAppMessage(message.from, message.kind === 'sticker' ? STICKER_ERROR_MESSAGE : TEXT_ERROR_MESSAGE).catch((sendErr) =>
      logger.error(`Failed to send error reply to ${message.from}: ${describeWhatsAppError(sendErr)}`),
    );
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

async function sendStats(to: string, timer: StepTimer): Promise<void> {
  const [topTags, topWords, topSearchers] = await timer.time('stats', () =>
    Promise.all([getTopStickerTags(STATS_TOP_LIMIT), getTopSearchWords(STATS_TOP_LIMIT), getTopSearchers(STATS_TOP_SEARCHERS_LIMIT)]),
  );
  await timer.time('reply', () => sendWhatsAppMessage(to, formatStatsMessage({ topTags, topWords, topSearchers })));
}

async function handleText({ from, text, contextId }: IncomingTextMessage, timer: StepTimer): Promise<void> {
  const command = text.trim().toLowerCase();
  if (command === STATS_COMMAND) {
    await sendStats(from, timer);
    return;
  }
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

  const matches = await timer.time('search', () => searchStickers(words));
  if (!matches.length) {
    await timer.time('reply', () => sendWhatsAppMessage(from, `לא נמצאו סטיקרים עבור "${words.join(' ')}".`));
    const event: CreateSearchEventData = {
      phone: from,
      query: text,
      words,
      matchedCount: 0,
      matchedStickerIds: [],
      nextOffset: 0,
      sentStickerIds: [],
      failedCount: 0,
      rateLimited: false,
      durationMs: timer.elapsedMs(),
    };
    // Metrics must never break or slow down a search.
    void recordSearchEvent(event).catch((err) => logger.error(`Failed to record search event: ${getErrorMessage(err)}`));
    return;
  }

  const matchedStickerIds = matches.map(({ _id }) => _id);
  const result = await sendStickers(from, matches.slice(0, STICKER_PAGE_SIZE), timer);
  const nextOffset = getNextOffset(matchedStickerIds, 0, result);
  const event: CreateSearchEventData = {
    phone: from,
    query: text,
    words,
    matchedCount: matches.length,
    matchedStickerIds,
    nextOffset,
    sentStickerIds: result.sentIds,
    failedCount: result.failed,
    rateLimited: Boolean(result.stoppedAt),
    durationMs: timer.elapsedMs(),
  };
  // The "עוד" button needs the stored search; without it the first page is all the user gets.
  const searchId = await timer
    .time('record', () => recordSearchEvent(event))
    .catch((err) => {
      logger.error(`Failed to record search event: ${getErrorMessage(err)}`);
      return null;
    });
  await sendPageStatus(from, searchId, { start: 0, nextOffset, total: matches.length, pageSize: Math.min(STICKER_PAGE_SIZE, matches.length), ...result }, timer);
}

// Only the newest search of a phone can continue, so an old button can't resend stickers that a newer search already sent.
async function handleButton({ from, buttonId }: IncomingButtonReplyMessage, timer: StepTimer): Promise<void> {
  const parsed = MORE_BUTTON_PATTERN.exec(buttonId);
  if (!parsed) {
    logger.warn(`Ignoring unknown button ${buttonId} from ${from}`);
    return;
  }
  const searchId = new ObjectId(parsed[1]);
  const offset = Number(parsed[2]);
  const latestId = await timer.time('findLatest', () => getLatestSearchId(from));
  const search = latestId?.equals(searchId) ? await timer.time('claim', () => claimSearchPage(searchId, from, offset, offset + STICKER_PAGE_SIZE)) : null;
  if (!search) {
    await timer.time('reply', () => sendWhatsAppMessage(from, STALE_BUTTON_MESSAGE));
    return;
  }

  const ids = search.matchedStickerIds;
  const stickers = await timer.time('findPage', () => findStickersByIds(ids.slice(offset, offset + STICKER_PAGE_SIZE)));
  const result = await sendStickers(from, stickers, timer);
  const nextOffset = getNextOffset(ids, offset, result);
  await timer
    .time('record', () => recordSearchPage(searchId, { nextOffset, sentIds: result.sentIds, failed: result.failed, rateLimited: Boolean(result.stoppedAt) }))
    .catch((err) => logger.error(`Failed to record search page: ${getErrorMessage(err)}`));
  await sendPageStatus(from, searchId, { start: offset, nextOffset, total: ids.length, pageSize: stickers.length, ...result }, timer);
}

type SendResult = {
  readonly sentIds: ObjectId[];
  readonly failed: number;
  readonly stoppedAt: ObjectId | null; // first sticker left unsent because of Meta's per-user rate limit
};

async function sendStickers(to: string, stickers: StickerSummary[], timer: StepTimer): Promise<SendResult> {
  const sentIds: ObjectId[] = [];
  let failed = 0;
  for (const [index, sticker] of stickers.entries()) {
    if (index > 0) await timer.time('delay', () => sleep(STICKER_SEND_DELAY_MS));
    try {
      await sendStickerWithBackoff(to, sticker, timer);
      sentIds.push(sticker._id);
    } catch (err) {
      if (isWhatsAppPairRateLimitError(err)) {
        logger.warn(`Pair rate limit hit while sending to ${to}, stopping after ${index} of ${stickers.length}`);
        return { sentIds, failed, stoppedAt: sticker._id };
      }
      failed++;
      logger.error(`Failed to send sticker ${sticker._id} to ${to}: ${describeWhatsAppError(err)}`);
    }
  }
  return { sentIds, failed, stoppedAt: null };
}

// Index in ids where the next page starts: after this page, or at the sticker the rate limit stopped on.
function getNextOffset(ids: ObjectId[], start: number, { stoppedAt }: SendResult): number {
  if (stoppedAt) return ids.findIndex((id) => id.equals(stoppedAt));
  return Math.min(start + STICKER_PAGE_SIZE, ids.length);
}

type PageStatus = SendResult & {
  readonly start: number;
  readonly nextOffset: number;
  readonly total: number;
  readonly pageSize: number;
};

async function sendPageStatus(to: string, searchId: ObjectId | null, { start, nextOffset, total, pageSize, failed, stoppedAt }: PageStatus, timer: StepTimer): Promise<void> {
  const remaining = total - nextOffset;
  if (!remaining) {
    if (failed) await timer.time('reply', () => sendWhatsAppMessage(to, failed === pageSize ? 'מצטער, לא הצלחתי לשלוח את הסטיקר.' : `מצטער, ${failed} מתוך ${pageSize} סטיקרים לא נשלחו.`));
    else if (start > 0) await timer.time('reply', () => sendWhatsAppMessage(to, 'זה הכול ✅'));
    return;
  }
  const lines = [stoppedAt && RATE_LIMIT_MESSAGE, failed && `מצטער, ${failed} סטיקרים לא נשלחו.`, `יש עוד ${remaining} סטיקרים.`].filter(Boolean);
  if (!searchId) {
    await timer.time('reply', () => sendWhatsAppMessage(to, [...lines, 'משהו השתבש ולא אוכל לשלוח את השאר.'].join('\n')));
    return;
  }
  await timer.time('reply', () => sendWhatsAppButtons(to, lines.join('\n'), [{ id: `more:${searchId}:${nextOffset}`, title: MORE_BUTTON_TITLE }]));
}

// On the pair rate limit, wait for the quota to recover and retry once before giving up.
async function sendStickerWithBackoff(to: string, sticker: StickerSummary, timer: StepTimer): Promise<void> {
  try {
    await sendStoredSticker(to, sticker, timer);
  } catch (err) {
    if (!isWhatsAppPairRateLimitError(err)) throw err;
    logger.warn(`Pair rate limit hit while sending to ${to}, retrying in ${STICKER_RATE_LIMIT_BACKOFF_MS}ms`);
    await timer.time('backoff', () => sleep(STICKER_RATE_LIMIT_BACKOFF_MS));
    await sendStoredSticker(to, sticker, timer);
  }
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
