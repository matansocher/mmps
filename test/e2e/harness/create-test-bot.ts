import { hydrate } from '@grammyjs/hydrate';
import { Bot } from 'grammy';
import type { UserFromGetMe } from 'grammy/types';
import type { TelegramBotConfig } from '@services/telegram';
import { createMockTransport, type MockTransport } from './mock-transport';

export type TestBot = {
  readonly bot: Bot;
  readonly transport: MockTransport;
};

const TEST_BOT_TOKEN = '1:test-token';

function buildFakeBotInfo(botConfig: TelegramBotConfig): UserFromGetMe {
  return {
    id: 1,
    is_bot: true,
    first_name: botConfig.name,
    username: `${botConfig.id.toLowerCase()}_test_bot`,
    can_join_groups: true,
    can_read_all_group_messages: true,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    can_manage_bots: true,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
  } as UserFromGetMe;
}

export function createTestBot(botConfig: TelegramBotConfig): TestBot {
  const bot = new Bot(TEST_BOT_TOKEN, { botInfo: buildFakeBotInfo(botConfig) });
  bot.use(hydrate());
  const transport = createMockTransport(bot);
  return { bot, transport };
}
