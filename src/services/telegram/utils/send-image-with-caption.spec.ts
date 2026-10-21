import type { Bot } from 'grammy';
import { TELEGRAM_MAX_CAPTION_LENGTH } from '../constants';
import { sendImageWithCaption } from './send-image-with-caption';

function createBot() {
  const calls: string[] = [];
  const sendPhoto = vi.fn(async (_chatId: number, _photo: unknown, form?: { caption?: string; parse_mode?: string }) => calls.push(`photo:${form?.caption ?? ''}:${form?.parse_mode ?? ''}`));
  const bot = { api: { sendPhoto } } as unknown as Bot;
  const sendText = vi.fn(async (_bot: Bot, _chatId: number, text: string) => calls.push(`text:${text}`));
  return { bot, sendPhoto, sendText, calls };
}

describe('sendImageWithCaption()', () => {
  test('should send the text as a Markdown caption of the image', async () => {
    const { bot, sendText, calls } = createBot();
    await sendImageWithCaption(bot, 1, { image: Buffer.from('png'), fileName: 'a.png', text: 'hello', sendText });
    expect(calls).toEqual(['photo:hello:Markdown']);
    expect(sendText).not.toHaveBeenCalled();
  });

  test('should retry the caption as plain text when Markdown is rejected', async () => {
    const { bot, sendPhoto, sendText, calls } = createBot();
    sendPhoto.mockRejectedValueOnce(new Error("can't parse entities"));
    await sendImageWithCaption(bot, 1, { image: Buffer.from('png'), fileName: 'a.png', text: 'hello_', sendText });
    expect(calls).toEqual(['photo:hello_:']);
  });

  test('should send image then text when the text is too long for a caption', async () => {
    const { bot, sendText, calls } = createBot();
    const text = 'a'.repeat(TELEGRAM_MAX_CAPTION_LENGTH + 1);
    await sendImageWithCaption(bot, 1, { image: Buffer.from('png'), fileName: 'a.png', text, sendText });
    expect(calls).toEqual(['photo::', `text:${text}`]);
  });

  test.each([
    { description: 'null image', image: null },
    {
      description: 'throwing builder',
      image: () => {
        throw new Error('render failed');
      },
    },
  ])('should send only the text for a $description', async ({ image }) => {
    const { bot, sendPhoto, sendText, calls } = createBot();
    await sendImageWithCaption(bot, 1, { image, fileName: 'a.png', text: 'hello', sendText });
    expect(sendPhoto).not.toHaveBeenCalled();
    expect(calls).toEqual(['text:hello']);
  });

  test('should send only the text when every upload fails', async () => {
    const { bot, sendPhoto, sendText, calls } = createBot();
    sendPhoto.mockRejectedValue(new Error('upload failed'));
    await sendImageWithCaption(bot, 1, { image: Buffer.from('png'), fileName: 'a.png', text: 'hello', sendText });
    expect(calls).toEqual(['text:hello']);
  });
});
