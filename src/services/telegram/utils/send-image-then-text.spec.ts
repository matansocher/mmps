import type { Bot } from 'grammy';
import { sendImageThenText } from './send-image-then-text';

function createBot() {
  const calls: string[] = [];
  const sendPhoto = vi.fn(async () => calls.push('photo'));
  const bot = { api: { sendPhoto } } as unknown as Bot;
  const sendText = vi.fn(async (_bot: Bot, _chatId: number, text: string) => calls.push(`text:${text}`));
  return { bot, sendPhoto, sendText, calls };
}

describe('sendImageThenText()', () => {
  test('should send the image before the text', async () => {
    const { bot, sendText, calls } = createBot();
    await sendImageThenText(bot, 1, { image: Buffer.from('png'), fileName: 'a.png', text: 'hello', sendText });
    expect(calls).toEqual(['photo', 'text:hello']);
  });

  test.each([
    { description: 'null image', image: null },
    { description: 'builder returning null', image: () => null },
    {
      description: 'throwing builder',
      image: () => {
        throw new Error('render failed');
      },
    },
  ])('should still send the text for a $description', async ({ image }) => {
    const { bot, sendPhoto, sendText, calls } = createBot();
    await sendImageThenText(bot, 1, { image, fileName: 'a.png', text: 'hello', sendText });
    expect(sendPhoto).not.toHaveBeenCalled();
    expect(calls).toEqual(['text:hello']);
  });

  test('should still send the text when the upload fails', async () => {
    const { bot, sendPhoto, sendText, calls } = createBot();
    sendPhoto.mockRejectedValueOnce(new Error('upload failed'));
    await sendImageThenText(bot, 1, { image: async () => Buffer.from('png'), fileName: 'a.png', text: 'hello', sendText });
    expect(calls).toEqual(['text:hello']);
  });
});
