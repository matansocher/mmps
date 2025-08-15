import { promises as fs } from 'fs';
import TelegramBot, { CallbackQuery, InlineKeyboardMarkup, Message } from 'node-telegram-bot-api';
import { env } from 'node:process';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { LOCAL_FILES_PATH, MY_USER_NAME } from '@core/config';
import { TeacherMongoCourseParticipationService, TeacherMongoCourseService, TeacherMongoUserPreferencesService, TeacherMongoUserService } from '@core/mongo/teacher-mongo';
import { NotifierService } from '@core/notifier';
import { deleteFile } from '@core/utils';
import { getAudioFromText } from '@services/openai';
import {
  BOT_BROADCAST_ACTIONS,
  getBotToken,
  getCallbackQueryData,
  getInlineKeyboardMarkup,
  getMessageData,
  MessageLoader,
  reactToMessage,
  registerHandlers,
  removeItemFromInlineKeyboardMarkup,
  TELEGRAM_EVENTS,
  TelegramEventHandler,
  UserDetails,
} from '@services/telegram';
import { ANALYTIC_EVENT_NAMES, BOT_ACTIONS, BOT_CONFIG } from './teacher.config';
import { TeacherService } from './teacher.service';

const loaderMessage = '👨‍🏫 Give me a few moments to think about it, one sec...';
const transcribeLoaderMessage = '👨‍🏫 Give me a few moments to transcribe it, one sec...';

@Injectable()
export class TeacherController implements OnModuleInit {
  private readonly logger = new Logger(TeacherController.name);
  private readonly botToken = getBotToken(BOT_CONFIG.id, env[BOT_CONFIG.token]);

  constructor(
    private readonly teacherService: TeacherService,
    private readonly courseDB: TeacherMongoCourseService,
    private readonly courseParticipationDB: TeacherMongoCourseParticipationService,
    private readonly userPreferencesDB: TeacherMongoUserPreferencesService,
    private readonly userDB: TeacherMongoUserService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, MESSAGE, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, ACTIONS, COURSE, ADD } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: COURSE.command, handler: (message) => this.courseHandler.call(this, message) },
      { event: COMMAND, regex: ADD.command, handler: (message) => this.addHandler.call(this, message) },
      { event: COMMAND, regex: ACTIONS.command, handler: (message) => this.actionsHandler.call(this, message) },
      { event: MESSAGE, handler: (message) => this.messageHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    await this.userStart(chatId, userDetails);
    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
  }

  private async actionsHandler(message: Message): Promise<void> {
    const { chatId, messageId } = getMessageData(message);
    const userPreferences = await this.userPreferencesDB.getUserPreference(chatId);
    const inlineKeyboardButtons = [
      userPreferences?.isStopped
        ? { text: '🟢 Start getting daily courses 🟢', callback_data: `${BOT_ACTIONS.START}` }
        : { text: '🛑 Stop getting daily courses 🛑', callback_data: `${BOT_ACTIONS.STOP}` },
      { text: '📬 Contact 📬', callback_data: `${BOT_ACTIONS.CONTACT}` },
    ];
    await this.bot.sendMessage(chatId, '👨‍🏫 How can I help?', { ...getInlineKeyboardMarkup(inlineKeyboardButtons) });
    await this.bot.deleteMessage(chatId, messageId).catch(() => {});
  }

  private async courseHandler(message: Message): Promise<void> {
    const { chatId, messageId, userDetails } = getMessageData(message);
    const activeCourse = await this.courseParticipationDB.getActiveCourseParticipation(chatId);
    if (activeCourse?._id) {
      await this.courseParticipationDB.markCourseParticipationCompleted(activeCourse._id.toString());
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.startNewCourse(chatId, true);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START_COURSE }, userDetails);
  }

  private async addHandler(message: Message): Promise<void> {
    const { chatId, userDetails } = getMessageData(message);
    const courseName = message.text.replace(BOT_CONFIG.commands.ADD.command, '').trim();
    if (!courseName?.length) {
      await this.bot.sendMessage(chatId, `Please add the course name after the add command.\n example: /add JavaScript Heap`);
      return;
    }
    await this.courseDB.createCourse(chatId, courseName);
    await this.bot.sendMessage(chatId, `OK, I added \`${courseName}\` to your courses list`);

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ADD, course: courseName }, userDetails);
  }

  async messageHandler(message: Message): Promise<void> {
    const { chatId, messageId, text, userDetails } = getMessageData(message);

    // prevent built in options to be processed also here
    if (Object.values(BOT_CONFIG.commands).some((command) => text.includes(command.command))) return;

    const activeCourseParticipation = await this.courseParticipationDB.getActiveCourseParticipation(chatId);
    if (!activeCourseParticipation) {
      await this.bot.sendMessage(chatId, `I see you dont have an active course\nIf you want to start a new one, just use the ${BOT_CONFIG.commands.COURSE.command} command`);
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.processQuestion(chatId, activeCourseParticipation, text);
    });

    this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.MESSAGE, text }, userDetails);
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, userDetails, messageId, data: response, text, replyMarkup } = getCallbackQueryData(callbackQuery);

    const [action, courseParticipationId] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.START:
        await this.userStart(chatId, userDetails);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.START }, userDetails);
        break;
      case BOT_ACTIONS.STOP:
        await this.stopHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.STOP }, userDetails);
        break;
      case BOT_ACTIONS.CONTACT:
        await this.contactHandler(chatId);
        await this.bot.deleteMessage(chatId, messageId).catch(() => {});
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.CONTACT }, userDetails);
        break;
      case BOT_ACTIONS.NEXT_LESSON:
        await this.handleCallbackNextLesson(chatId, messageId);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.NEXT_LESSON }, userDetails);
        break;
      case BOT_ACTIONS.TRANSCRIBE:
        await this.handleCallbackTranscribeMessage(chatId, messageId, text, replyMarkup);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.TRANSCRIBE_LESSON }, userDetails);
        break;
      case BOT_ACTIONS.COMPLETE:
        await this.handleCallbackCompleteCourse(chatId, messageId, courseParticipationId);
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.COMPLETE_COURSE }, userDetails);
        break;
      default:
        this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, response }, userDetails);
        throw new Error('Invalid action');
    }
  }

  private async userStart(chatId: number, userDetails: UserDetails): Promise<void> {
    await this.userPreferencesDB.createUserPreference(chatId);
    const userExists = await this.userDB.saveUserDetails(userDetails);
    const newUserReplyText = [
      `Hey There 👋`,
      `I am here to teach you all you need about any subject you want.`,
      `I will send you daily lessons of stuff I collect on the internet and summarize it for you in a great way that you can learn from. 😁`,
      `You can always add a course topic by sending me the topic on this format - /add <course topic>, example: /add JavaScript Heap`,
    ].join('\n\n');
    const existingUserReplyText = `All set 👨‍💻`;
    await this.bot.sendMessage(chatId, userExists ? existingUserReplyText : newUserReplyText);
  }

  private async stopHandler(chatId: number): Promise<void> {
    await this.userPreferencesDB.updateUserPreference(chatId, { isStopped: true });
    const replyText = [
      'OK, I will stop teaching you for now 🛑',
      `Whenever you are ready, just send me the Start command and we will continue learning`,
      `Another option for you is to start courses manually with the ${BOT_CONFIG.commands.COURSE.command} command`,
    ].join('\n\n');
    await this.bot.sendMessage(chatId, replyText);
  }

  async contactHandler(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, [`Off course!, you can talk to the person who created me, he might be able to help 📬`, MY_USER_NAME].join('\n'));
  }

  private async handleCallbackNextLesson(chatId: number, messageId: number): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { reactionEmoji: '🤔', loaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      await this.teacherService.processLesson(chatId, false);
    });
  }

  private async handleCallbackTranscribeMessage(chatId: number, messageId: number, text: string, replyMarkup: InlineKeyboardMarkup): Promise<void> {
    const messageLoaderService = new MessageLoader(this.bot, this.botToken, chatId, messageId, { loadingAction: BOT_BROADCAST_ACTIONS.UPLOADING_VOICE, loaderMessage: transcribeLoaderMessage });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const filteredInlineKeyboardMarkup = removeItemFromInlineKeyboardMarkup(replyMarkup, BOT_ACTIONS.TRANSCRIBE);
      await this.bot.editMessageReplyMarkup(filteredInlineKeyboardMarkup, { message_id: messageId, chat_id: chatId }).catch(() => {});

      await reactToMessage(this.botToken, chatId, messageId, '🤯');

      const result = await getAudioFromText(text);

      const audioFilePath = `${LOCAL_FILES_PATH}/teacher-text-to-speech-${new Date().getTime()}.mp3`;
      const buffer = Buffer.from(await result.arrayBuffer());
      await fs.writeFile(audioFilePath, buffer);

      await this.bot.sendVoice(chatId, audioFilePath);
      await deleteFile(audioFilePath);
    });
  }

  private async handleCallbackCompleteCourse(chatId: number, messageId: number, courseParticipationId: string): Promise<void> {
    await this.courseParticipationDB.markCourseParticipationCompleted(courseParticipationId);
    await this.bot.editMessageReplyMarkup(undefined, { message_id: messageId, chat_id: chatId }).catch(() => {});
    await reactToMessage(this.botToken, chatId, messageId, '😎');
  }
}
