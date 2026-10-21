import { InputFile } from 'grammy';
import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { TELEGRAM_MAX_CAPTION_LENGTH } from '../constants';
import { sendImageThenText } from './send-image-then-text';
import type { SendImageThenTextOptions } from './send-image-then-text';

const logger = new Logger('telegram:send-image-with-caption');

// Sends the text as the image's Markdown caption in one message. Falls back to image-then-text when the text is too long for a caption or the upload fails.
export async function sendImageWithCaption(bot: Bot, chatId: number, options: SendImageThenTextOptions): Promise<void> {
  const { image, fileName, text } = options;
  if (text.length > TELEGRAM_MAX_CAPTION_LENGTH) {
    await sendImageThenText(bot, chatId, options);
    return;
  }

  let buffer: Buffer | null = null;
  try {
    buffer = typeof image === 'function' ? await image() : image;
  } catch (err) {
    logger.error(`Failed to render image ${fileName}: ${getErrorMessage(err)}`);
  }
  if (!buffer) {
    await sendImageThenText(bot, chatId, { ...options, image: null });
    return;
  }

  try {
    await bot.api.sendPhoto(chatId, new InputFile(buffer, fileName), { caption: text, parse_mode: 'Markdown' });
    return;
  } catch (err) {
    logger.warn(`Markdown caption rejected for ${fileName}, retrying as plain text: ${getErrorMessage(err)}`);
  }

  try {
    await bot.api.sendPhoto(chatId, new InputFile(buffer, fileName), { caption: text });
  } catch (err) {
    logger.error(`Failed to send image ${fileName} with caption: ${getErrorMessage(err)}`);
    await sendImageThenText(bot, chatId, { ...options, image: null });
  }
}
