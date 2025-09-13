import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getStreakOfCorrectAnswers } from '@core/utils';
import { getActiveSubscriptions, getTopBy } from '@features/wolt/mongo';
import { getUserDetails as getWoltUserDetails } from '@features/wolt/mongo';
import { getGameLogsByUsers, getTopByChatId } from '@features/worldly/mongo';
import { getUserDetails as getWorldlyUserDetails } from '@features/worldly/mongo';
import { GameLog } from '@features/worldly/types';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { CookerService, generateRecipeString } from './cooker';
import { BOT_ACTIONS, BOT_CONFIG } from './notifier.config';

type LightUser = {
  readonly chatId: number;
  readonly correctCount: number;
  readonly records: GameLog[];
  readonly user: string;
};

@Injectable()
export class NotifierController implements OnModuleInit {
  private readonly logger = new Logger(NotifierController.name);

  constructor(
    private readonly cookerService: CookerService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { WOLT, WORLDLY, RECIPES } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: WOLT.command, handler: (message) => this.woltSummaryHandler.call(this, message) },
      { event: COMMAND, regex: WORLDLY.command, handler: (message) => this.worldlySummaryHandler.call(this, message) },
      { event: COMMAND, regex: RECIPES.command, handler: (message) => this.recipesHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    await this.bot.sendMessage(chatId, 'I am here');
  }

  async woltSummaryHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const topChatIds = await getTopBy('chatId');

    const topUsers = await Promise.all(
      topChatIds.map(async ({ _id, count }) => {
        const user = await getWoltUserDetails(_id);
        const userName = user ? `${user.firstName} ${user.lastName} - ${user.username}` : 'Unknown User';
        return { _id, count, user: userName };
      }),
    );

    const topRestaurants = await getTopBy('restaurant');

    const replyText = `
Top users this week:\n${topUsers.map(({ user, count }, index) => `${index + 1}. ${user} (${count})`).join('\n')}

Top restaurants this week:\n${topRestaurants.map(({ _id, count }, index) => `${index + 1}. ${_id} (${count})`).join('\n')}
    `;
    await this.bot.sendMessage(chatId, replyText);
  }

  async worldlySummaryHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);

    const topChatIds = await getTopByChatId(10);

    const topUsers: LightUser[] = await Promise.all(
      topChatIds.map(async ({ chatId, records }) => {
        const { user } = await this.getUser([], chatId);
        const correctCount = records.filter((r) => r.selected === r.correct).length;
        return { chatId, user, correctCount, records };
      }),
    );

    const gameLogsByUsers = await getGameLogsByUsers();
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    const streaks = Object.entries(gameLogsByUsers).map(([chatId, logs]) => {
      const fullStreak = getStreakOfCorrectAnswers(logs).longestStreak;
      const weekLogs = logs.filter((log) => new Date(log.createdAt) >= startOfWeek);
      const weeklyStreak = getStreakOfCorrectAnswers(weekLogs).longestStreak;
      return { chatId: Number(chatId), fullStreak, weeklyStreak };
    });

    const longestOverall = this.getMaxStreak(streaks, 'fullStreak');
    const longestThisWeek = this.getMaxStreak(streaks, 'weeklyStreak');

    const greatestStreakUser = await this.getUser(topUsers, longestOverall?.chatId);
    const greatestWeekUser = await this.getUser(topUsers, longestThisWeek?.chatId);

    const summaryLines = topUsers.map(({ user, correctCount, records }, i) => {
      const percentage = ((correctCount / records.length) * 100).toFixed(2);
      return `${i + 1}. ${user}: ${correctCount}/${records.length} - ${percentage}%`;
    });

    const replyText = `
🏆 Greatest Streak Ever: ${greatestStreakUser ? `${greatestStreakUser.user} (${longestOverall.fullStreak})` : 'No record'}
📅 Greatest Streak This Week: ${greatestWeekUser ? `${greatestWeekUser.user} (${longestThisWeek.weeklyStreak})` : 'No record'}

🔥 Top Users This Week:
${summaryLines.join('\n')}
  `;

    await this.bot.sendMessage(chatId, replyText.trim());
  }

  async recipesHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const recipes = await this.cookerService.getRecipes(chatId);
    const inlineKeyboardButtons = recipes.map((recipe) => {
      const { _id, emoji, title } = recipe;
      return { text: `${title} ${emoji}`, callback_data: `${BOT_ACTIONS.SHOW} - ${_id}` };
    });
    await this.bot.sendMessage(chatId, 'איזה מתכון בא לך?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons, 2) });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [action, resource] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.SHOW: {
        const recipe = await this.cookerService.getRecipe(chatId, resource);
        if (!recipe) {
          await this.bot.sendMessage(chatId, 'מתכון לא נמצא');
          return;
        }
        await this.bot.sendMessage(chatId, generateRecipeString(recipe), { parse_mode: 'Markdown' });
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        break;
      }
      default:
        throw new Error('Invalid action');
    }
  }

  private getMaxStreak<T extends { [key: string]: any }>(records: T[], key: string): T {
    return records.reduce((max, curr) => (curr[key] > max[key] ? curr : max), { [key]: 0 } as T);
  }

  async getUser(existingUsers: { chatId: number; user: string }[], chatId: number): Promise<{ chatId: number; user: string } | null> {
    if (!chatId) return null;

    const cached = existingUsers.find((u) => u.chatId === chatId);
    if (cached) return { chatId, user: cached.user };

    const user = await getWorldlyUserDetails(chatId);
    const userName = [user?.firstName, user?.lastName, user?.username].filter(Boolean).join(' ') || 'Unknown User';
    return { chatId, user: userName };
  }
}
