import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BOT_CONFIG } from '@src/features/chilli/chilli.config';
import { ChilliController } from '@src/features/chilli/chilli.controller';
import { buildTextMessageUpdate, createTestBot, resetUpdateBuilderCounters, simulateUpdate, type TestBot } from './harness';

vi.mock('@services/notifier', () => ({ notify: vi.fn() }));
vi.mock('@src/features/chilli/mongo', () => ({
  getPrompt: vi.fn(),
  insertPromptVersion: vi.fn(),
}));

describe('ChilliController E2E', () => {
  let testBot: TestBot;
  let processMessage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetUpdateBuilderCounters();
    vi.clearAllMocks();
    testBot = createTestBot(BOT_CONFIG);
    processMessage = vi.fn().mockResolvedValue('miau');
    const chilliService = { processMessage } as any;
    const controller = new ChilliController(chilliService, testBot.bot);
    controller.init();
  });

  describe('/update', () => {
    it('rejects update attempts from non-owner users', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: '/update something new' }));

      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent).toHaveLength(1);
      expect(sent[0].payload.text).toContain('רק גוז');
    });
  });

  describe('text message', () => {
    it('routes a plain text message through ChilliService and replies with the cat persona output', async () => {
      processMessage.mockResolvedValueOnce('סבתא, אכלתי. לפני 4 שעות.');

      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'איפה את?' }));

      expect(processMessage).toHaveBeenCalledWith('איפה את?', expect.any(Number));
      const sent = testBot.transport.callsByMethod('sendMessage');
      expect(sent.at(-1)?.payload.text).toEqual('סבתא, אכלתי. לפני 4 שעות.');
    });

    it('reacts with 😁 before generating the reply', async () => {
      await simulateUpdate(testBot, buildTextMessageUpdate({ text: 'שלום' }));

      const reactions = testBot.transport.callsByMethod('setMessageReaction');
      expect(reactions).toHaveLength(1);
      expect(reactions[0].payload.reaction[0].emoji).toEqual('😁');
    });
  });
});
