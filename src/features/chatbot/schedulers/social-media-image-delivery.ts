import type { Bot } from 'grammy';
import { GrammyError, InputMediaBuilder } from 'grammy';
import { getErrorMessage, Logger, sleep } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { claimDigestImage, finalizeDigestImage, getDigestDelivery } from '@shared/social-follower';
import type { DigestImageEntry } from '@shared/social-follower';
import { MAX_CAPTION_LENGTH } from './social-media-video-delivery';

const logger = new Logger('chatbot:scheduler:social-media-image-delivery');

const MAX_ALBUM_SIZE = 10; // Telegram media group limit (tweets carry at most 4 photos anyway)
const MAX_RATE_LIMIT_WAIT_MS = 30_000;

// Creator header + source link are always kept; only the tweet text is truncated to fit.
export function buildImageCaption(entry: DigestImageEntry, maxLen: number = MAX_CAPTION_LENGTH): string {
  const creator = entry.displayName?.trim() || `@${entry.username}`;
  const header = `🐦 ${creator}`;
  const suffix = entry.url?.trim() ? `\n${entry.url.trim()}` : '';
  // X appends the media's own t.co link to the tweet text; drop it, the photos are right here.
  const text =
    entry.text
      ?.replace(/\s*https:\/\/t\.co\/\w+\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim() ?? '';
  const available = maxLen - header.length - suffix.length - 1;
  if (!text || available <= 0) {
    return `${header}${suffix}`;
  }
  const body = text.length > available ? `${text.slice(0, Math.max(0, available - 1))}…` : text;
  return `${header}\n${body}${suffix}`;
}

async function sendAlbum(bot: Bot, chatId: number, entry: DigestImageEntry, caption: string): Promise<void> {
  const media = entry.imageUrls.slice(0, MAX_ALBUM_SIZE).map((url, i) => InputMediaBuilder.photo(url, i === 0 ? { caption } : {}));
  try {
    await bot.api.sendMediaGroup(chatId, media, { disable_notification: true });
  } catch (err) {
    // 429 is rejected before processing, so one re-send after the mandated pause is safe.
    const retryAfterMs = err instanceof GrammyError && err.error_code === 429 ? (err.parameters?.retry_after ?? 0) * 1000 : null;
    if (retryAfterMs === null || retryAfterMs > MAX_RATE_LIMIT_WAIT_MS) {
      throw err;
    }
    await sleep(retryAfterMs);
    await bot.api.sendMediaGroup(chatId, media, { disable_notification: true });
  }
}

async function deliverOne(bot: Bot, chatId: number, digestDate: string, entry: DigestImageEntry): Promise<'sent' | 'link_only'> {
  const caption = buildImageCaption(entry);
  try {
    if (!entry.imageUrls.length) {
      throw new Error('entry has no image urls');
    }
    await sendAlbum(bot, chatId, entry, caption);
  } catch (err) {
    logger.error(`Digest images ${entry.entryId} failed, falling back to link-only: ${getErrorMessage(err)}`);
    if (entry.url) {
      await sendShortenedMessage(bot, chatId, caption).catch((sendErr) => logger.error(`Failed to send link-only fallback for digest images ${entry.entryId}: ${getErrorMessage(sendErr)}`));
    }
    await finalizeDigestImage(chatId, digestDate, entry.entryId, 'link_only');
    return 'link_only';
  }
  await finalizeDigestImage(chatId, digestDate, entry.entryId, 'sent');
  return 'sent';
}

// Sends the tweet photo albums recorded for one chat's digest date. Driven by the delivery record
// (pending posts may already be deleted); each entry is atomically claimed so runs can't double-send.
export async function deliverDigestImages(bot: Bot, chatId: number, digestDate: string): Promise<void> {
  const record = await getDigestDelivery(chatId, digestDate);
  if (!record?.images?.length) {
    return;
  }

  let sent = 0;
  let linkOnly = 0;
  let skipped = 0;
  for (const entry of record.images) {
    const claimed = entry.state === 'pending' ? await claimDigestImage(chatId, digestDate, entry.entryId) : null;
    if (!claimed) {
      skipped += 1;
      continue;
    }
    try {
      if ((await deliverOne(bot, chatId, digestDate, claimed)) === 'sent') {
        sent += 1;
      } else {
        linkOnly += 1;
      }
    } catch (err) {
      linkOnly += 1;
      logger.error(`Unexpected failure delivering digest images ${claimed.entryId}: ${getErrorMessage(err)}`);
    }
  }

  logger.log(`Chat ${chatId} digest images: ${sent} sent, ${linkOnly} link-only, ${skipped} skipped`);
}
