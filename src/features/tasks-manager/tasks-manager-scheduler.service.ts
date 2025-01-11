import TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotifierBotService } from '@core/notifier-bot';
import { TasksManagerMongoTaskService } from '@core/mongo/tasks-manager-mongo';
import { BOTS, getInlineKeyboardMarkup } from '@services/telegram';
import { ANALYTIC_EVENS, BOT_ACTIONS } from './tasks-manager-bot.config';
import { isWithinQuietHours, shouldNotify } from './utils';
import { getErrorMessage } from '@core/utils';

@Injectable()
export class TasksManagerSchedulerService {
  private readonly logger = new Logger(TasksManagerSchedulerService.name);

  constructor(
    private readonly mongoTaskService: TasksManagerMongoTaskService,
    private readonly notifierBotService: NotifierBotService,
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
      const error = `${getErrorMessage(err)}`;
      this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: ANALYTIC_EVENS.ERROR, error, flow: 'cron' }, null, null);
      this.logger.error(`Error processing tasks: ${err.message}`, err.stack);
    }
  }

  private async notifyUser(task: any): Promise<void> {
    const { chatId, title } = task;
    try {
      const inlineKeyboardButtons = [{ text: 'Mark as completed', callback_data: `${task._id} - ${BOT_ACTIONS.TASK_COMPLETED}` }];
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      const resText = `You wanted me to remind you about:\n${title}`;
      this.bot.sendMessage(chatId, resText, inlineKeyboardMarkup as any);
      await this.mongoTaskService.updateLastNotifiedAt(chatId, task._id, new Date());
    } catch (err) {
      this.logger.error(`${this.notifyUser.name} | Failed to notify user ${chatId} for task "${title}": ${getErrorMessage(err)}`);
    }
  }
}
