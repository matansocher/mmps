import { InputFile } from 'grammy';
import type { Bot } from 'grammy';
import type { InputRichMessage } from 'grammy/types';
import { sendRichMessageWithPhotos } from './send-rich-message-with-photos';

function createBot() {
  const sendRichMessage = vi.fn(async () => ({}));
  const sendPhoto = vi.fn(async () => ({}));
  const sendMessage = vi.fn(async () => ({}));
  const bot = { api: { sendRichMessage, sendPhoto, sendMessage } } as unknown as Bot;
  return { bot, sendRichMessage, sendPhoto, sendMessage };
}

const PHOTO = { image: Buffer.from('png'), fileName: 'route.png' };
const FORM = { reply_markup: { inline_keyboard: [] } };

describe('sendRichMessageWithPhotos()', () => {
  test('should send a plain rich message when there are no photos', async () => {
    const { bot, sendRichMessage, sendPhoto } = createBot();
    await sendRichMessageWithPhotos(bot, 1, '**hello**', [], FORM);
    expect(sendRichMessage).toHaveBeenCalledWith(1, { markdown: '**hello**' }, FORM);
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  test('should embed the photos and keep the form in a single rich message', async () => {
    const { bot, sendRichMessage, sendPhoto } = createBot();
    await sendRichMessageWithPhotos(bot, 1, '**hello**', [PHOTO, { ...PHOTO, fileName: 'b.png' }], FORM);
    expect(sendRichMessage).toHaveBeenCalledTimes(1);
    const [chatId, richMessage, form] = sendRichMessage.mock.calls[0] as unknown as [number, InputRichMessage<InputFile>, object];
    expect(chatId).toEqual(1);
    expect(form).toEqual(FORM);
    expect(richMessage.markdown).toEqual('![](tg://photo?id=photo_0)\n\n![](tg://photo?id=photo_1)\n\n**hello**');
    expect(richMessage.media.map(({ id, media }) => ({ id, type: media.type, isFile: media.media instanceof InputFile }))).toEqual([
      { id: 'photo_0', type: 'photo', isFile: true },
      { id: 'photo_1', type: 'photo', isFile: true },
    ]);
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  test('should fall back to the photo followed by the text when the combined message fails', async () => {
    const { bot, sendRichMessage, sendPhoto } = createBot();
    const calls: string[] = [];
    sendRichMessage.mockImplementationOnce(async () => {
      throw new Error('bad request');
    });
    sendRichMessage.mockImplementationOnce(async () => calls.push('text'));
    sendPhoto.mockImplementationOnce(async () => calls.push('photo'));
    await sendRichMessageWithPhotos(bot, 1, 'hello', [PHOTO], FORM);
    expect(calls).toEqual(['photo', 'text']);
    expect(sendRichMessage).toHaveBeenLastCalledWith(1, { markdown: 'hello' }, FORM);
  });

  test('should still send the text when the fallback photo upload fails', async () => {
    const { bot, sendRichMessage, sendPhoto } = createBot();
    sendRichMessage.mockRejectedValueOnce(new Error('bad request'));
    sendPhoto.mockRejectedValueOnce(new Error('upload failed'));
    await sendRichMessageWithPhotos(bot, 1, 'hello', [PHOTO], FORM);
    expect(sendRichMessage).toHaveBeenLastCalledWith(1, { markdown: 'hello' }, FORM);
  });
});
