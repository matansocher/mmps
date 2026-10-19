import { InputFile } from 'grammy';
import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { sendRichMessage } from './send-message';

const logger = new Logger('telegram:send-image-then-text');

export type ImageSource = Buffer | null | (() => Buffer | null | Promise<Buffer | null>);

export type SendImageThenTextOptions = {
  readonly image: ImageSource;
  readonly fileName: string;
  readonly text: string;
  // Defaults to sendRichMessage; pass sendShortenedMessage / sendStyledMessage to keep a scheduler's current formatting.
  readonly sendText?: (bot: Bot, chatId: number, text: string) => Promise<unknown>;
};

// Telegram captions are capped at 1024 chars, so the image goes out bare and the full text follows as a normal message.
// Rendering or uploading the image never blocks the text.
export async function sendImageThenText(bot: Bot, chatId: number, { image, fileName, text, sendText = sendRichMessage }: SendImageThenTextOptions): Promise<void> {
  try {
    const buffer = typeof image === 'function' ? await image() : image;
    if (buffer) {
      await bot.api.sendPhoto(chatId, new InputFile(buffer, fileName));
    }
  } catch (err) {
    logger.error(`Failed to send image ${fileName}: ${getErrorMessage(err)}`);
  }
  await sendText(bot, chatId, text);
}
