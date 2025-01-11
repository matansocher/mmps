import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotifierBotService } from '@core/notifier-bot';
import { TasksManagerMongoTaskService } from '@core/mongo/tasks-manager-mongo';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService } from '@services/telegram';
import { ANALYTIC_EVENS, BOT_ACTIONS } from './tasks-manager-bot.config';
import { isWithinQuietHours, shouldNotify } from './tasks-manager-bot.utils';

@Injectable()
export class TasksManagerSchedulerService {
  private readonly logger = new Logger(TasksManagerSchedulerService.name);

  constructor(
    private readonly utilsService: UtilsService,
    private readonly mongoTaskService: TasksManagerMongoTaskService,
    private readonly notifierBotService: NotifierBotService,
    private readonly telegramGeneralService: TelegramGeneralService,
    @Inject(BOTS.TASKS_MANAGER.name) private readonly bot: TelegramBot,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async processTasks(): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();

    if (isWithinQuietHours(currentHour)) {
      this.logger.debug(`Skipped processing tasks due to quiet hours.`);
      return;
    }

    this.logger.log(`Processing tasks at ${now.toISOString()}`);
    try {
      const tasks = await this.mongoTaskService.getActiveTasks();

      for (const task of tasks) {
        if (shouldNotify(task, now)) {
          await this.notifyUser(task);
          this.logger.debug(`Notified user ${task.chatId} about task "${task.title}"`);
        }
      }
    } catch (err) {
      const error = `${this.utilsService.getErrorMessage(err)}`;
      this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: ANALYTIC_EVENS.ERROR, error, flow: 'cron' }, null, null);
      this.logger.error(`Error processing tasks: ${err.message}`, err.stack);
    }
  }

  private async notifyUser(task: any): Promise<void> {
    const { chatId, title } = task;
    try {
      const inlineKeyboardButtons = [{ text: 'Mark as completed', callback_data: `${task._id} - ${BOT_ACTIONS.TASK_COMPLETED}` }];
      const inlineKeyboardMarkup = this.telegramGeneralService.getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = `You wanted me to remind you about:\n${title}`;
      this.telegramGeneralService.sendMessage(this.bot, chatId, resText, inlineKeyboardMarkup);
      await this.mongoTaskService.updateLastNotifiedAt(chatId, task._id, new Date());
    } catch (err) {
      this.logger.error(`${this.notifyUser.name} | Failed to notify user ${chatId} for task "${title}": ${this.utilsService.getErrorMessage(err)}`);
    }
  }
}
