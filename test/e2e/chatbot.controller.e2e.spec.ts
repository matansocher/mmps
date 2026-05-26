import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_CONFIG } from '@src/features/chatbot/chatbot.config';
import { ChatbotController } from '@src/features/chatbot/chatbot.controller';
import { ChatbotLauncherService } from '@src/features/chatbot/launcher.service';
import { buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

describe('ChatbotController E2E', () => {
  let testBot: TestBot;
  let processMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    testBot = createTestBot(BOT_CONFIG);
    processMessage = vi.fn().mockResolvedValue({ message: 'stub reply', toolResults: [] });
    const chatbotService = { processMessage } as any;
    const launcher = new ChatbotLauncherService(testBot.bot);
    const controller = new ChatbotController(chatbotService, testBot.bot, launcher);
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

    const sent = testBot.transport.callsByMethod('sendMessage');
    expect(sent.length).toBeGreaterThanOrEqual(1);
    const reply = sent[sent.length - 1];
    expect(reply.payload.text).toEqual('stub reply');
  });

  it('runs the exercise prompt through ChatbotService on /exercise', async () => {
    await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/exercise' }));

    expect(processMessage).toHaveBeenCalledWith('I exercised', expect.any(Number));
  });
});
