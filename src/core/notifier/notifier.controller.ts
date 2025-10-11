import TelegramBot, { Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getStreakOfCorrectAnswers } from '@core/utils';
import { getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { getTopBy, getUserDetails as getUserDetailsWolt } from '@shared/wolt';
import { GameLog, getGameLogsByUsers, getTopByChatId, getUserDetails as getUserDetailsWorldly } from '@shared/worldly';
import { BOT_CONFIG } from './notifier.config';

type LightUser = {
  readonly chatId: number;
  readonly correctCount: number;
  readonly records: GameLog[];
  readonly user: string;
};

@Injectable()
export class NotifierController implements OnModuleInit {
  private readonly logger = new Logger(NotifierController.name);

  constructor(@Inject(BOT_CONFIG.id) private readonly bot: TelegramBot) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE } = TELEGRAM_EVENTS;
    const { WOLT, WORLDLY } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: WOLT.command, handler: (message) => this.woltSummaryHandler.call(this, message) },
      { event: COMMAND, regex: WORLDLY.command, handler: (message) => this.worldlySummaryHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
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
        const user = await getUserDetailsWolt(_id);
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

  private getMaxStreak<T extends { [key: string]: any }>(records: T[], key: string): T {
    return records.reduce((max, curr) => (curr[key] > max[key] ? curr : max), { [key]: 0 } as T);
  }

  async getUser(existingUsers: { chatId: number; user: string }[], chatId: number): Promise<{ chatId: number; user: string } | null> {
    if (!chatId) return null;

    const cached = existingUsers.find((u) => u.chatId === chatId);
    if (cached) return { chatId, user: cached.user };

    const user = await getUserDetailsWorldly(chatId);
    const userName = [user?.firstName, user?.lastName, user?.username].filter(Boolean).join(' ') || 'Unknown User';
    return { chatId, user: userName };
  }
}
