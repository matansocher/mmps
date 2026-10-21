import { BOT_CONFIG } from '@src/features/chatbot/chatbot.config';
import { ChatbotController } from '@src/features/chatbot/chatbot.controller';
import { FILE_SUMMARY_MAX_BYTES } from '@src/features/chatbot/file-summary';
import { buildToolImages } from '@src/features/chatbot/tool-images';
import { fileToDataUrl } from '@src/features/chatbot/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteFile } from '@core/utils';
import { notify } from '@services/notifier';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile } from '@services/telegram';
import {
  buildDocumentMessageUpdate,
  buildPhotoMessageUpdate,
  buildTextMessageUpdate,
  buildVoiceMessageUpdate,
  createTestBot,
  DEFAULT_USER_ID,
  resetUpdateBuilderCounters,
  simulateUpdate,
  type TestBot,
} from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('@services/openai/utils/get-transcript-from-audio', () => ({ getTranscriptFromAudio: vi.fn() }));
vi.mock('@src/features/chatbot/tool-images', () => ({ buildToolImages: vi.fn() }));
vi.mock('@src/features/chatbot/utils', async (importOriginal) => ({ ...(await importOriginal<object>()), fileToDataUrl: vi.fn() }));
vi.mock('@core/utils', async (importOriginal) => ({ ...(await importOriginal<object>()), deleteFile: vi.fn() }));
vi.mock('@services/telegram', async (importOriginal) => ({ ...(await importOriginal<object>()), downloadFile: vi.fn() }));

const NON_OWNER_USER_ID = DEFAULT_USER_ID + 1;

describe('ChatbotController E2E', () => {
  let testBot: TestBot;
  let processMessage: ReturnType<typeof vi.fn>;
  let prepareSummary: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetUpdateBuilderCounters();
    testBot = createTestBot(BOT_CONFIG);
    processMessage = vi.fn().mockResolvedValue({ message: 'stub reply', toolResults: [] });
    vi.mocked(buildToolImages).mockResolvedValue([]);
    vi.mocked(downloadFile).mockResolvedValue('/tmp/downloaded-file');
    vi.mocked(fileToDataUrl).mockResolvedValue('data:image/jpeg;base64,abc');
    vi.mocked(getTranscriptFromAudio).mockResolvedValue('transcribed text');
    const chatbotService = { processMessage } as any;
    const secretaryMessageService = { storeMessage: vi.fn(), hasSpokenWithChatToday: vi.fn(), buildDailySummaries: vi.fn(), clearMessagesBefore: vi.fn() } as any;
    const secretaryActionService = { execute: vi.fn() } as any;
    prepareSummary = vi.fn();
    const fileSummaryService = { prepareSummary } as any;
    const controller = new ChatbotController(chatbotService, testBot.bot, secretaryMessageService, secretaryActionService, fileSummaryService);
    controller.init();
  });

  it('replies with the static greeting on /start', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start' }));

    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent).toHaveLength(1);
    expect(sent[0].payload.text).toContain('Hi, I am your chatbot');
    expect(processMessage).not.toHaveBeenCalled();
  });

  it('routes a plain text message through ChatbotService and sends the styled reply', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'what is the weather?' }));

    expect(processMessage).toHaveBeenCalledWith('what is the weather?', expect.any(Number), expect.objectContaining({ callbacks: expect.any(Array) }));

    const sent = testBot.transport.callsByMethod('sendRichMessage');
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const reply = sent[sent.length - 1];
    expect(reply.payload.rich_message.markdown).toEqual('stub reply');
  });

  it('prefixes the prompt with the replied-to message text', async () => {
    const update = buildTextMessageUpdate({ text: 'remind me about this tomorrow' });
    (update.message as any).reply_to_message = { message_id: 1, date: 0, chat: update.message.chat, text: 'Dentist on Sunday at 10:00' };

    await simulateUpdate(testBot, update);

    expect(processMessage).toHaveBeenCalledTimes(1);
    expect(processMessage.mock.calls[0][0]).toEqual('[Replying to: "Dentist on Sunday at 10:00"]\n\nremind me about this tomorrow');
  });

  it('ignores a text message from a non-owner and notifies the owner', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'hello bot', userId: NON_OWNER_USER_ID }));

    expect(processMessage).not.toHaveBeenCalled();
    expect(testBot.transport.callsByMethod('sendMessage')).toHaveLength(0);
    expect(testBot.transport.callsByMethod('sendRichMessage')).toHaveLength(0);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(BOT_CONFIG, { action: 'BLOCKED_MESSAGE' }, expect.objectContaining({ telegramUserId: NON_OWNER_USER_ID }));
  });

  it('ignores /start from a non-owner and notifies the owner', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/start', userId: NON_OWNER_USER_ID }));

    expect(testBot.transport.callsByMethod('sendMessage')).toHaveLength(0);
    expect(processMessage).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not notify when the owner sends a message', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'hi there' }));

    expect(processMessage).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('rejects oversized documents before summarization', async () => {
    await simulateUpdate(
      testBot,
      buildDocumentMessageUpdate({
        filename: 'large.pdf',
        mimeType: 'application/pdf',
        fileSize: FILE_SUMMARY_MAX_BYTES + 1,
      }),
    );

    expect(prepareSummary).not.toHaveBeenCalled();
    expect(processMessage).not.toHaveBeenCalled();
    expect(testBot.transport.textsSent()[0]).toContain('too large');
  });

  it.each([
    { name: 'text', update: () => buildTextMessageUpdate({ text: 'show me a chart' }) },
    { name: 'photo', update: () => buildPhotoMessageUpdate({ caption: 'what is this?' }) },
    { name: 'voice', update: () => buildVoiceMessageUpdate() },
  ])('sends tool images before the reply for $name messages', async ({ update }) => {
    vi.mocked(buildToolImages).mockResolvedValue([{ fileName: 'chart.png', image: Buffer.from('png') }]);

    await simulateUpdate(testBot, update());

    const methods = testBot.transport.calls.map(({ method }) => method).filter((method) => method === 'sendPhoto' || method === 'sendRichMessage');
    expect(methods).toEqual(['sendPhoto', 'sendRichMessage']);
  });

  it('sends tool images for document messages', async () => {
    prepareSummary.mockResolvedValue({ prompt: 'summarize', images: [] });
    vi.mocked(buildToolImages).mockResolvedValue([{ fileName: 'table.png', image: Buffer.from('png') }]);

    await simulateUpdate(testBot, buildDocumentMessageUpdate({ filename: 'doc.pdf', mimeType: 'application/pdf', fileSize: 1000 }));

    expect(testBot.transport.callsByMethod('sendPhoto')).toHaveLength(1);
    expect(deleteFile).toHaveBeenCalledWith('/tmp/downloaded-file');
  });

  it('prefixes the document prompt with the replied-to message text', async () => {
    prepareSummary.mockResolvedValue({ prompt: 'summarize', images: [] });
    const update = buildDocumentMessageUpdate({ filename: 'doc.pdf', mimeType: 'application/pdf', fileSize: 1000 });
    (update.message as any).reply_to_message = { message_id: 1, date: 0, chat: update.message.chat, text: 'Compare it with last year' };

    await simulateUpdate(testBot, update);

    expect(processMessage.mock.calls[0][0]).toEqual('[Replying to: "Compare it with last year"]\n\nsummarize');
  });

  it('passes the photo to the agent and deletes the downloaded file', async () => {
    await simulateUpdate(testBot, buildPhotoMessageUpdate({ caption: 'what is this?' }));

    expect(processMessage).toHaveBeenCalledWith('what is this?', expect.any(Number), expect.objectContaining({ images: ['data:image/jpeg;base64,abc'], callbacks: expect.any(Array) }));
    expect(deleteFile).toHaveBeenCalledWith('/tmp/downloaded-file');
  });

  it('deletes the voice file and tells the user when transcription fails', async () => {
    vi.mocked(getTranscriptFromAudio).mockRejectedValue(new Error('whisper down'));

    await expect(simulateUpdate(testBot, buildVoiceMessageUpdate())).rejects.toThrow('whisper down');

    expect(deleteFile).toHaveBeenCalledWith('/tmp/downloaded-file');
    expect(processMessage).not.toHaveBeenCalled();
    expect(testBot.transport.textsSent()).toContain('Something went wrong. Please try again.');
  });
});
