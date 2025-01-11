import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@core/logger';
import { TasksManagerMongoTaskService, TasksManagerMongoUserService } from '@core/mongo/tasks-manager-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { UtilsService } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData, getCallbackQueryData, getInlineKeyboardMarkup } from '@services/telegram';
import { ANALYTIC_EVENS, BOT_ACTIONS, INITIAL_BOT_RESPONSE, INVALID_INPUT, TASKS_MANAGER_BOT_OPTIONS } from './tasks-manager-bot.config';
import { getKeyboardOptions, getTaskDetails, validateUserTaskInput } from './tasks-manager-bot.utils';

@Injectable()
export class TasksManagerBotService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
    private readonly telegramGeneralService: TelegramGeneralService,
    private readonly mongoUserService: TasksManagerMongoUserService,
    private readonly mongoTaskService: TasksManagerMongoTaskService,
    private readonly notifierBotService: NotifierBotService,
    @Inject(BOTS.TASKS_MANAGER.name) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    this.createBotEventListeners();
    this.createErrorEventListeners();
  }

  createErrorEventListeners(): void {
    this.bot.on('polling_error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TASKS_MANAGER.name, 'polling_error', error));
    this.bot.on('error', async (error) => this.telegramGeneralService.botErrorHandler(BOTS.TASKS_MANAGER.name, 'error', error));
  }

  createBotEventListeners(): void {
    this.bot.onText(/\/start/, (message: Message) => this.startHandler(message));
    this.bot.onText(/\/manage/, (message: Message) => this.manageHandler(message));
    this.bot.on('text', (message: Message) => this.textHandler(message));
    this.bot.on('callback_query', (callbackQuery: CallbackQuery) => this.callbackQueryHandler(callbackQuery));
  }

  async handleActionError(action: string, logBody: string, err: Error, chatId: number): Promise<void> {
    const errorMessage = `error: ${this.utilsService.getErrorMessage(err)}`;
    this.logger.error(action, `${logBody} - ${errorMessage}`);
    await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: `${action} - ${ANALYTIC_EVENS.ERROR}`, error: errorMessage }, chatId, this.mongoUserService);
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.startHandler.name, `${logBody} - start`);
      await this.bot.sendMessage(chatId, INITIAL_BOT_RESPONSE, getKeyboardOptions());
      this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: ANALYTIC_EVENS.START }, chatId, this.mongoUserService);
    } catch (err) {
      return this.handleActionError(this.startHandler.name, logBody, err, chatId);
    }
  }

  async manageHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.info(this.manageHandler.name, `${logBody} - start`);

      const tasks = await this.mongoTaskService.getActiveTasks(chatId);
      if (!tasks?.length) {
        const replyText = `You don't have any tasks yet. Create one by typing the task and the interval, e.g. "1d - Do something"`;
        await this.bot.sendMessage(chatId, replyText);
      }
      await Promise.all(
        tasks.map((task) => {
          const inlineKeyboardButtons = [{ text: 'Mark as completed', callback_data: `${task._id} - ${BOT_ACTIONS.TASK_COMPLETED}` }];
          const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
          return this.bot.sendMessage(chatId, task.title, inlineKeyboardMarkup as any);
        }),
      );
    } catch (err) {
      return this.handleActionError(this.manageHandler.name, logBody, err, chatId);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TASKS_MANAGER_BOT_OPTIONS).map((option) => TASKS_MANAGER_BOT_OPTIONS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.info(this.textHandler.name, `${logBody} - start`);

    try {
      const isUserTaskTextValid = validateUserTaskInput(text);
      if (!isUserTaskTextValid) {
        return await this.bot.sendMessage(chatId, INVALID_INPUT);
      }
      const taskDetails = getTaskDetails(text);
      await this.mongoTaskService.addTask(chatId, taskDetails);
      const replyText = `OK, I will remind you about "${taskDetails.title}"`;

      await this.bot.sendMessage(chatId, replyText);
      this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: ANALYTIC_EVENS.ADD_TASK, text }, chatId, this.mongoUserService);
    } catch (err) {
      return this.handleActionError(this.manageHandler.name, logBody, err, chatId);
    }
  }

  async callbackQueryHandler(callbackQuery: CallbackQuery) {
    const { chatId, firstName, lastName, data: response } = getCallbackQueryData(callbackQuery);
    const logBody = `callback_query :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, response: ${response}`;
    this.logger.info(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const [taskId, action] = response.split(' - ');
      switch (action) {
        case BOT_ACTIONS.TASK_COMPLETED:
          await this.handleCallbackCompleteTask(logBody, chatId, taskId);
          break;
        default:
          throw new Error('Invalid action');
      }
    } catch (err) {
      return this.handleActionError(this.callbackQueryHandler.name, logBody, err, chatId);
    }
  }

  async handleCallbackCompleteTask(logBody: string, chatId: number, taskId: string) {
    const task = await this.mongoTaskService.getTask(chatId, taskId);
    if (!task) {
      const replyText = `I couldn't find an open task under that name, are you sure you didnt already complete it? 🤔`;
      await this.bot.sendMessage(chatId, replyText);
    }
    await this.mongoTaskService.markTaskCompleted(chatId, taskId);
    const replyText = `Nice job 🎉🍾\nI have marked the task as completed`;
    await this.bot.sendMessage(chatId, replyText);
  }
}
