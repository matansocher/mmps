import { InputFile } from 'grammy';
import type { Bot } from 'grammy';
import { getErrorMessage, Logger } from '@core/utils';
import { TELEGRAM_MAX_RICH_MESSAGE_LENGTH } from '../constants';
import { sendRichMessage } from './send-message';

const logger = new Logger('telegram:send-rich-message-with-photos');

export type RichPhoto = {
  readonly image: Buffer;
  readonly fileName: string;
};

// Also used to edit such a message in place (editMessageText accepts the same rich input).
export function buildRichMessageWithPhotos(markdown: string, photos: readonly RichPhoto[]) {
  const media = photos.map(({ image, fileName }, index) => ({ id: `photo_${index}`, media: { type: 'photo' as const, media: new InputFile(image, fileName) } }));
  const photoMarkdown = media.map(({ id }) => `![](tg://photo?id=${id})`).join('\n\n');
  return { markdown: `${photoMarkdown}\n\n${markdown}`.slice(0, TELEGRAM_MAX_RICH_MESSAGE_LENGTH), media };
}

// Embeds the photos above the markdown in a single rich message (no 1024-char caption limit, same formatting as sendRichMessage).
// If Telegram rejects it, falls back to sending each photo on its own followed by the text.
export async function sendRichMessageWithPhotos(bot: Bot, chatId: number, markdown: string, photos: readonly RichPhoto[], form = {}): Promise<void> {
  if (!photos.length) {
    await sendRichMessage(bot, chatId, markdown, form);
    return;
  }

  try {
    await bot.api.sendRichMessage(chatId, buildRichMessageWithPhotos(markdown, photos), form);
    return;
  } catch (err) {
    logger.error(`Failed to send rich message with photos, falling back to separate messages: ${getErrorMessage(err)}`);
  }

  for (const { image, fileName } of photos) {
    await bot.api.sendPhoto(chatId, new InputFile(image, fileName)).catch((err) => logger.error(`Failed to send image ${fileName}: ${getErrorMessage(err)}`));
  }
  await sendRichMessage(bot, chatId, markdown, form);
}
