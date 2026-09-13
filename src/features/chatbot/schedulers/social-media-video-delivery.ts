import type { Bot } from 'grammy';
import { GrammyError, InputFile } from 'grammy';
import { promises as fs } from 'node:fs';
import { getErrorMessage, Logger, sleep } from '@core/utils';
import { sendShortenedMessage } from '@services/telegram';
import { downloadTikTokVideo } from '@services/tiktok';
import { claimDigestVideo, finalizeDigestVideo, getDigestDelivery } from '@shared/social-follower';
import type { DigestVideoEntry } from '@shared/social-follower';
import { CHATBOT_CONFIG } from '../chatbot.config';

const logger = new Logger('chatbot:scheduler:social-media-video-delivery');

// Telegram caption hard cap. Captions longer than this are rejected, so we truncate the middle
// (post text) while always keeping the creator header and the source link.
export const MAX_CAPTION_LENGTH = 1024;

// Builds a caption that always carries the creator and the source link (so the link is
// delivered even if the big-text digest was truncated), truncating only the post text to fit.
export function buildVideoCaption(entry: DigestVideoEntry, maxLen: number = MAX_CAPTION_LENGTH): string {
  const creator = entry.displayName?.trim() || `@${entry.username}`;
  const header = `🎵 ${creator}`;
  const link = entry.url?.trim() ?? '';
  const suffix = link ? `\n${link}` : '';
  const captionText = entry.text?.replace(/\s+/g, ' ').trim() ?? '';
  const available = maxLen - header.length - suffix.length - 1; // room for the newline before the text
  if (!captionText || available <= 0) {
    return `${header}${suffix}`;
  }
  const body = captionText.length > available ? `${captionText.slice(0, Math.max(0, available - 1))}…` : captionText;
  return `${header}\n${body}${suffix}`;
}

// Returns the retry delay (ms) for a Telegram rate-limit error, or null for any other error.
// A 429 is a pre-processing rejection (the upload never happened), so re-sending is safe; a
// timeout/network error is ambiguous and must NOT trigger a re-upload.
function rateLimitRetryMs(err: unknown): number | null {
  if (err instanceof GrammyError && err.error_code === 429) {
    const seconds = err.parameters?.retry_after;
    return typeof seconds === 'number' ? seconds * 1000 : 0;
  }
  return null;
}

async function fallbackToLink(bot: Bot, chatId: number, digestDate: string, entry: DigestVideoEntry, caption: string): Promise<void> {
  try {
    await sendShortenedMessage(bot, chatId, caption);
  } catch (err) {
    logger.error(`Failed to send link-only fallback for digest video ${entry.entryId}: ${getErrorMessage(err)}`);
  }
  await finalizeDigestVideo(chatId, digestDate, entry.entryId, 'link_only');
}

// Downloads and sends one already-claimed (`sending`) video with bounded short retries, all
// capped by an OVERALL per-video wall-clock budget (`totalBudgetMs`) so worst-case time can't
// grow to maxAttempts * (timeout + 429 sleep). Retries a failed DOWNLOAD freely; retries a
// failed SEND only on a rate-limit (safe re-upload) and never on an ambiguous timeout. Any
// exhausted/ambiguous failure falls back to a link-only message so the source link is still
// delivered. Returns the final outcome and always cleans up the temp file.
async function deliverOne(bot: Bot, chatId: number, digestDate: string, entry: DigestVideoEntry): Promise<'sent' | 'link_only'> {
  const { maxAttempts, maxBytes, downloadTimeoutMs, maxRedirects, totalBudgetMs } = CHATBOT_CONFIG.videoDigest;
  const caption = buildVideoCaption(entry);

  if (!entry.url) {
    logger.error(`Digest video ${entry.entryId} has no source url, falling back to link-only`);
    await fallbackToLink(bot, chatId, digestDate, entry, caption);
    return 'link_only';
  }

  const deadline = Date.now() + totalBudgetMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    // Overall budget gate: never start an attempt once the per-video deadline has passed.
    const remainingBudget = deadline - Date.now();
    if (remainingBudget <= 0) {
      logger.warn(`Digest video ${entry.entryId} exhausted its ${totalBudgetMs}ms budget before attempt ${attempt}, falling back to link-only`);
      await fallbackToLink(bot, chatId, digestDate, entry, caption);
      return 'link_only';
    }

    let filePath: string | null = null;
    try {
      // Cap this attempt's download timeout by the remaining budget so a single attempt can't
      // run past the overall deadline. A 429 retry re-downloads rather than reusing this temp
      // file: keeping the download inside the try/finally is what guarantees cleanup on every
      // path (incl. ambiguous timeouts), and threading a survivor file across iterations would
      // weaken that story for a marginal saving — a deliberate simplicity-over-micro-opt choice.
      const download = await downloadTikTokVideo(entry.url, { maxBytes, timeoutMs: Math.min(downloadTimeoutMs, remainingBudget), maxRedirects });
      filePath = download.path;
      const message = await bot.api.sendVideo(chatId, new InputFile(filePath), { caption, supports_streaming: true, disable_notification: true });
      await finalizeDigestVideo(chatId, digestDate, entry.entryId, 'sent', message.message_id);
      return 'sent';
    } catch (err) {
      const isDownloadFailure = filePath === null;
      const retryAfterMs = rateLimitRetryMs(err);
      let shouldRetry = false;
      if (attempt < maxAttempts) {
        if (isDownloadFailure) {
          shouldRetry = true;
        } else if (retryAfterMs !== null) {
          // 429 is a safe re-send, but only wait+retry when the mandated pause still leaves budget
          // for another attempt; otherwise the sleep would just push us past the deadline.
          const remainingAfterErr = deadline - Date.now();
          if (retryAfterMs < remainingAfterErr) {
            await sleep(retryAfterMs);
            shouldRetry = true;
          }
        }
      }
      if (shouldRetry) {
        logger.warn(`Retrying digest video ${entry.entryId} (attempt ${attempt} failed): ${getErrorMessage(err)}`);
        continue;
      }
      logger.error(`Digest video ${entry.entryId} failed on attempt ${attempt}, falling back to link-only: ${getErrorMessage(err)}`);
      await fallbackToLink(bot, chatId, digestDate, entry, caption);
      return 'link_only';
    } finally {
      if (filePath) {
        await fs.unlink(filePath).catch(() => undefined);
      }
    }
  }

  await fallbackToLink(bot, chatId, digestDate, entry, caption);
  return 'link_only';
}

// Sends the TikTok video attachments recorded for one chat's digest date. Driven entirely by the
// delivery record (not by pending posts, which may already be deleted): each still-`pending`
// entry is atomically claimed so concurrent runs can't double-send, then delivered independently
// — one video's failure never blocks the others.
export async function deliverDigestVideos(bot: Bot, chatId: number, digestDate: string): Promise<void> {
  const record = await getDigestDelivery(chatId, digestDate);
  if (!record?.videos.length) {
    return;
  }

  let sent = 0;
  let linkOnly = 0;
  let skipped = 0;
  for (const entry of record.videos) {
    if (entry.state !== 'pending') {
      skipped += 1;
      continue;
    }
    const claimed = await claimDigestVideo(chatId, digestDate, entry.entryId);
    if (!claimed) {
      skipped += 1; // another run already grabbed this one
      continue;
    }
    try {
      const outcome = await deliverOne(bot, chatId, digestDate, claimed);
      if (outcome === 'sent') {
        sent += 1;
      } else {
        linkOnly += 1;
      }
    } catch (err) {
      linkOnly += 1;
      logger.error(`Unexpected failure delivering digest video ${claimed.entryId}: ${getErrorMessage(err)}`);
    }
  }

  logger.log(`Chat ${chatId} digest videos: ${sent} sent, ${linkOnly} link-only, ${skipped} skipped`);
}
