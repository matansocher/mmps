import { BOT_CONFIG } from '@src/features/chatbot/chatbot.config';
import { ChatbotController } from '@src/features/chatbot/chatbot.controller';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notify } from '@services/notifier';
import { buildTextMessageUpdate, createTestBot, DEFAULT_USER_ID, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));

const NON_OWNER_USER_ID = DEFAULT_USER_ID + 1;

describe('ChatbotController E2E', () => {
  let testBot: TestBot;
  let processMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetUpdateBuilderCounters();
    testBot = createTestBot(BOT_CONFIG);
    processMessage = vi.fn().mockResolvedValue({ message: 'stub reply', toolResults: [] });
    const chatbotService = { processMessage } as any;
    const secretaryMessageService = { storeMessage: vi.fn(), hasSpokenWithChatToday: vi.fn(), buildDailySummaries: vi.fn(), clearMessagesBefore: vi.fn() } as any;
    const secretaryActionService = { execute: vi.fn() } as any;
    const controller = new ChatbotController(chatbotService, testBot.bot, secretaryMessageService, secretaryActionService);
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

    expect(processMessage).toHaveBeenCalledWith('what is the weather?', expect.any(Number));

    const sent = testBot.transport.callsByMethod('sendRichMessage');
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const reply = sent[sent.length - 1];
    expect(reply.payload.rich_message.markdown).toEqual('stub reply');
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
});
