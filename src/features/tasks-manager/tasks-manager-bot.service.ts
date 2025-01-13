import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TasksManagerMongoTaskService, TasksManagerMongoUserService } from '@core/mongo/tasks-manager-mongo';
import { NotifierBotService } from '@core/notifier-bot';
import { getErrorMessage } from '@core/utils';
import { BOTS, TelegramGeneralService, getMessageData, getCallbackQueryData, getInlineKeyboardMarkup } from '@services/telegram';
import {
  ACTION_VALUE_SEPARATOR,
  ANALYTIC_EVENS,
  BOT_ACTIONS,
  INITIAL_BOT_RESPONSE,
  INVALID_INPUT,
  TASKS_MANAGER_BOT_OPTIONS,
} from './tasks-manager-bot.config';
import { getKeyboardOptions, validateUserTaskInput } from './utils';

@Injectable()
export class TasksManagerBotService implements OnModuleInit {
  private readonly logger = new Logger(TasksManagerBotService.name);

  constructor(
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
    const errorMessage = `error: ${getErrorMessage(err)}`;
    this.logger.error(action, `${logBody} - ${errorMessage}`);
    await this.bot.sendMessage(chatId, `Sorry, but something went wrong`);
    this.notifierBotService.notify(BOTS.TASKS_MANAGER.name, { action: `${action} - ${ANALYTIC_EVENS.ERROR}`, error: errorMessage }, chatId, this.mongoUserService);
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, firstName, lastName } = getMessageData(message);
    const logBody = `start :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}`;

    try {
      this.logger.log(this.startHandler.name, `${logBody} - start`);
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
      this.logger.log(this.manageHandler.name, `${logBody} - start`);

      const tasks = await this.mongoTaskService.getActiveTasks(chatId);
      if (!tasks?.length) {
        const replyText = `You don't have any tasks yet. Create one by typing the task and the interval, e.g. "1d Do something"`;
        await this.bot.sendMessage(chatId, replyText);
      }

      const inlineKeyboardButtons = tasks.map((task) => {
        return { text: task.title, callback_data: `${task._id}${ACTION_VALUE_SEPARATOR}${BOT_ACTIONS.TASK_COMPLETED}` };
      });
      const inlineKeyboardMarkup = getInlineKeyboardMarkup(inlineKeyboardButtons);
      await this.bot.sendMessage(chatId, `Here are your current tasks.\nClick on a task to mark it as completed`, inlineKeyboardMarkup as any);
    } catch (err) {
      return this.handleActionError(this.manageHandler.name, logBody, err, chatId);
    }
  }

  async textHandler(message: Message) {
    const { chatId, firstName, lastName, text } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.keys(TASKS_MANAGER_BOT_OPTIONS).map((option) => TASKS_MANAGER_BOT_OPTIONS[option]).includes(text)) return;

    const logBody = `message :: chatId: ${chatId}, firstname: ${firstName}, lastname: ${lastName}, text: ${text}`;
    this.logger.log(this.textHandler.name, `${logBody} - start`);

    try {
      const { isValid, taskDetails } = validateUserTaskInput(text);
      if (!isValid) {
        return await this.bot.sendMessage(chatId, INVALID_INPUT);
      }
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
    this.logger.log(this.callbackQueryHandler.name, `${logBody} - start`);

    try {
      const [taskId, action] = response.split(ACTION_VALUE_SEPARATOR);
      switch (action) {
        case BOT_ACTIONS.TASK_COMPLETED:
          await this.handleCallbackCompleteTask(chatId, taskId);
          break;
        default:
          throw new Error('Invalid action');
      }
    } catch (err) {
      return this.handleActionError(this.callbackQueryHandler.name, logBody, err, chatId);
    }
  }

  async handleCallbackCompleteTask(chatId: number, taskId: string) {
    const task = await this.mongoTaskService.getTask(chatId, taskId);
    if (!task) {
      const replyText = `I couldn't find an open task under that name, are you sure you didnt already complete it? 🤔`;
      return this.bot.sendMessage(chatId, replyText);
    }
    await this.mongoTaskService.markTaskCompleted(chatId, taskId);
    const replyText = `Nice job 🎉🍾\nI have marked the task as completed`;
    await this.bot.sendMessage(chatId, replyText);
  }
}
