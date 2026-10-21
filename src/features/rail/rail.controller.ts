import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { type Bot, type Context, type InlineKeyboard, InputFile } from 'grammy';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_TIMEZONE, LOCAL_FILES_PATH, MY_USER_NAME } from '@core/config';
import { createRateLimitCounter } from '@core/express';
import { deleteFile, getErrorMessage, Logger } from '@core/utils';
import { buildToolImages, RAIL_ROUTE_IMAGE_BUILDER } from '@features/chatbot/tool-images';
import { notify } from '@services/notifier';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import {
  buildInlineKeyboard,
  buildRichMessageWithPhotos,
  downloadFile,
  getCallbackQueryData,
  getMessageData,
  MessageLoader,
  type RichPhoto,
  sendRichMessage,
  sendRichMessageWithPhotos,
  type UserDetails,
} from '@services/telegram';
import { detectLanguage, type ImageLanguage } from '@shared/image-card';
import { getAvatarHash, getUserLanguagePreference, saveAvatarHash, saveUserDetails, setUserLanguagePreference } from './mongo';
import type { RailWakeService } from './rail-wake.service';
import { buildWakeCancelKeyboard, buildWakeTrainPickerKeyboard, formatWakeConfirmation, parseWakeCallbackData, type WakeCallbackRequest } from './rail-wake.utils';
import { BOT_CONFIG, BOT_PROFILE, COMMAND_DESCRIPTIONS, CONTACT_MESSAGE_TTL_MS, MESSAGES, RAIL_LIMITS, START_MESSAGE } from './rail.config';
import { RailService } from './rail.service';
import {
  appendSourceFooter,
  buildActionsKeyboard,
  buildContactCancelKeyboard,
  buildNearestStationsKeyboard,
  buildRouteKeyboard,
  formatNearestStationsMessage,
  formatRouteMessage,
  formatStopsMessage,
  getAnswerSources,
  getContactUrl,
  getOppositeLanguage,
  getRefreshSearchTime,
  getRouteContext,
  getUserLanguage,
  parseCallbackData,
  parseMenuCallbackData,
  type RailMenuAction,
  type RailSearchAction,
  type RailSearchRequest,
} from './rail.utils';

const GLOBAL_KEY = 'all';
const AVATAR_PATH = resolve(process.cwd(), 'assets/images/rail/avatar.png');
const ROUTE_IMAGE_FILE_NAME = 'rail-route.png';

const CALLBACK_ACTIONS: Record<Exclude<RailSearchAction, 'stops' | 'where'>, string> = { later: 'LATER_TRAINS', reverse: 'REVERSE_DIRECTION', refresh: 'REFRESH' };

function getLocalNow(): Date {
  return toZonedTime(new Date(), DEFAULT_TIMEZONE);
}

function isNotModifiedError(err: unknown): boolean {
  return getErrorMessage(err).includes('message is not modified');
}

function notifyConversation(action: string, question: string, answer: string, userDetails: UserDetails): void {
  notify(BOT_CONFIG, { action, plainText: `❓ ${question}\n\n💬 ${answer}` }, userDetails);
}

export class RailController {
  private readonly logger = new Logger(RailController.name);
  private readonly hitUserLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.userWindowMs, prefix: 'rail-bot:user' });
  private readonly hitGlobalLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.globalWindowMs, prefix: 'rail-bot:global' });
  // chatId -> expiry of a pending "send a message to the developer" request from /actions.
  private readonly pendingContact = new Map<number, number>();

  constructor(
    private readonly railService: RailService,
    private readonly railWakeService: RailWakeService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    const { START, ACTIONS } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(ACTIONS.command.replace('/', ''), (ctx) => this.actionsHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on(['message:voice', 'message:audio'], (ctx) => this.audioHandler(ctx));
    this.bot.on('message:location', (ctx) => this.locationHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.syncBotProfile().catch((err) => this.logger.error(`Failed to set bot profile: ${getErrorMessage(err)}`));
    this.syncBotAvatar().catch((err) => this.logger.error(`Failed to set bot avatar: ${getErrorMessage(err)}`));
  }

  // English is the default for every Telegram language except Hebrew, matching getUserLanguage.
  private async syncBotProfile(): Promise<void> {
    const { en, he } = BOT_PROFILE;
    await Promise.all([
      this.bot.api.setMyDescription(en.description),
      this.bot.api.setMyShortDescription(en.shortDescription),
      this.bot.api.setMyDescription(he.description, { language_code: 'he' }),
      this.bot.api.setMyShortDescription(he.shortDescription, { language_code: 'he' }),
    ]);
  }

  // Every upload adds a new photo to the bot's profile history, so only upload when the file changed.
  private async syncBotAvatar(): Promise<void> {
    const avatar = await readFile(AVATAR_PATH);
    const hash = createHash('sha256').update(avatar).digest('hex');
    if ((await getAvatarHash()) === hash) return;
    await this.bot.api.setMyProfilePhoto({ type: 'static', photo: new InputFile(avatar, 'avatar.png') });
    await saveAvatarHash(hash);
    this.logger.log('Bot avatar updated');
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    const saveResult = await saveUserDetails(userDetails);
    await ctx.reply(START_MESSAGE, { reply_markup: { remove_keyboard: true } });
    notify(BOT_CONFIG, { action: 'START', isNewUser: saveResult === 'created' }, userDetails);
  }

  private async actionsHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    const language = (await getUserLanguagePreference(chatId)) ?? getUserLanguage(ctx.from?.language_code);
    await ctx.reply(MESSAGES.actionsTitle[language], { reply_markup: buildActionsKeyboard(language, getContactUrl(MY_USER_NAME)) });
    notify(BOT_CONFIG, { action: 'ACTIONS' }, userDetails);
  }

  private async menuActionHandler(ctx: Context, action: RailMenuAction): Promise<void> {
    const { chatId, userDetails } = getCallbackQueryData(ctx);
    const savedLanguage = await getUserLanguagePreference(chatId);
    const language = savedLanguage ?? getUserLanguage(ctx.from?.language_code);

    switch (action) {
      case 'language': {
        const newLanguage = getOppositeLanguage(language);
        await saveUserDetails(userDetails);
        await setUserLanguagePreference(chatId, newLanguage);
        await ctx.answerCallbackQuery({ text: MESSAGES.languageSaved[newLanguage] }).catch(() => {});
        await ctx.editMessageText(MESSAGES.actionsTitle[newLanguage], { reply_markup: buildActionsKeyboard(newLanguage, getContactUrl(MY_USER_NAME)) }).catch(() => {});
        await this.setChatCommands(chatId, newLanguage);
        notify(BOT_CONFIG, { action: 'LANGUAGE_CHANGED', language: newLanguage }, userDetails);
        return;
      }
      case 'contact':
        await ctx.answerCallbackQuery().catch(() => {});
        this.pendingContact.set(chatId, Date.now() + CONTACT_MESSAGE_TTL_MS);
        await ctx.reply(MESSAGES.contactPrompt[language], { reply_markup: buildContactCancelKeyboard(language) });
        notify(BOT_CONFIG, { action: 'CONTACT' }, userDetails);
        return;
      case 'cancel_contact':
        await ctx.answerCallbackQuery({ text: MESSAGES.contactCancelled[language] }).catch(() => {});
        this.pendingContact.delete(chatId);
        await ctx.deleteMessage().catch(() => {});
        return;
    }
  }

  private async setChatCommands(chatId: number, language: ImageLanguage): Promise<void> {
    const commands = Object.entries(BOT_CONFIG.commands).map(([key, { command }]) => ({
      command: command.replace('/', ''),
      description: COMMAND_DESCRIPTIONS[language][key as keyof (typeof COMMAND_DESCRIPTIONS)['he']],
    }));
    await this.bot.api.setMyCommands(commands, { scope: { type: 'chat', chat_id: chatId } }).catch((err) => this.logger.error(`Failed to set chat commands: ${getErrorMessage(err)}`));
  }

  // Consumes the pending contact request, if any, so the next text message goes to the developer instead of the agent.
  private takePendingContact(chatId: number): boolean {
    const expiresAt = this.pendingContact.get(chatId);
    if (expiresAt === undefined) return false;
    this.pendingContact.delete(chatId);
    return expiresAt > Date.now();
  }

  // Counts every expensive request (text, voice, buttons) against a per-user and a bot-wide window.
  private async isRateLimited(ctx: Context, language: ImageLanguage): Promise<boolean> {
    const userId = ctx.from?.id ?? ctx.chat?.id;
    const [userHits, globalHits] = await Promise.all([this.hitUserLimit(String(userId)), this.hitGlobalLimit(GLOBAL_KEY)]);
    if (userHits > RAIL_LIMITS.userMaxRequests) {
      // Only answer on the first blocked hit so a spammer doesn't make us spam back.
      if (userHits === RAIL_LIMITS.userMaxRequests + 1) await ctx.reply(MESSAGES.userRateLimited[language]).catch(() => {});
      return true;
    }
    if (globalHits > RAIL_LIMITS.globalMaxRequests) {
      this.logger.warn(`Global rate limit reached (${globalHits})`);
      await ctx.reply(MESSAGES.globalRateLimited[language]).catch(() => {});
      return true;
    }
    return false;
  }

  private async textHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text, userDetails } = getMessageData(ctx);
    const savedLanguage = await getUserLanguagePreference(chatId);
    const language = savedLanguage ?? detectLanguage(text);
    if (await this.isRateLimited(ctx, language)) return;

    if (this.takePendingContact(chatId)) {
      notify(BOT_CONFIG, { action: 'CONTACT_MESSAGE', chatId, plainText: `✉️ ${text}` }, userDetails);
      await ctx.reply(MESSAGES.contactSent[language]);
      return;
    }

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      const answer = await this.answerQuery(chatId, text, language, !!savedLanguage);
      notifyConversation('MESSAGE', text, answer, userDetails);
    });
  }

  private async audioHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, audio, userDetails } = getMessageData(ctx);
    const savedLanguage = await getUserLanguagePreference(chatId);
    const fallbackLanguage = savedLanguage ?? getUserLanguage(ctx.from?.language_code);
    if (await this.isRateLimited(ctx, fallbackLanguage)) return;
    if (audio?.duration > RAIL_LIMITS.maxVoiceSeconds) {
      await ctx.reply(MESSAGES.voiceTooLong[fallbackLanguage]);
      return;
    }

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      let audioFilePath: string | null = null;
      let transcript = '';
      try {
        audioFilePath = await downloadFile(this.bot, audio.file_id, LOCAL_FILES_PATH);
        transcript = (await getTranscriptFromAudio(audioFilePath)).trim();
      } catch (err) {
        this.logger.error(`Voice transcription failed: ${getErrorMessage(err)}`);
      } finally {
        if (audioFilePath) deleteFile(audioFilePath);
      }

      if (!transcript) {
        await ctx.reply(MESSAGES.voiceNotUnderstood[fallbackLanguage]);
        notifyConversation('VOICE_MESSAGE', '(voice not understood)', MESSAGES.voiceNotUnderstood[fallbackLanguage], userDetails);
        return;
      }
      const answer = await this.answerQuery(chatId, transcript, savedLanguage ?? detectLanguage(transcript), !!savedLanguage);
      notifyConversation('VOICE_MESSAGE', transcript, answer, userDetails);
    });
  }

  // Deterministic, no-LLM answer; the reply is still saved to the agent memory so follow-ups can use the location.
  private async locationHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, location, userDetails } = getMessageData(ctx);
    const language = (await getUserLanguagePreference(chatId)) ?? getUserLanguage(ctx.from?.language_code);
    if (location?.lat == null || location?.lon == null) return;
    if (await this.isRateLimited(ctx, language)) return;

    const question = `📍 ${location.lat},${location.lon}`;
    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      try {
        const result = await this.railService.findNearestStations(location);
        const answer = formatNearestStationsMessage(result, language);
        const keyboard = buildNearestStationsKeyboard(result, language);
        await sendRichMessage(this.bot, chatId, answer, keyboard ? { reply_markup: keyboard } : {});
        await this.railService.rememberLocation(chatId, location, answer);
        notifyConversation('LOCATION', question, answer, userDetails);
      } catch (err) {
        this.logger.error(`locationHandler failed: ${getErrorMessage(err)}`);
        await ctx.reply(MESSAGES.locationFailed[language]);
        notifyConversation('LOCATION', question, `${MESSAGES.locationFailed[language]} (${getErrorMessage(err)})`, userDetails);
      }
    });
  }

  private async answerQuery(chatId: number, text: string, language: ImageLanguage, isLanguageSaved: boolean): Promise<string> {
    const { message: reply, toolResults } = await this.railService.processMessage(text, chatId, language, isLanguageSaved);
    const replyLanguage = isLanguageSaved ? language : detectLanguage(reply);
    const message = appendSourceFooter(reply, getAnswerSources(toolResults), format(getLocalNow(), 'HH:mm'), replyLanguage);

    const images = await buildToolImages(toolResults, message, [RAIL_ROUTE_IMAGE_BUILDER]);
    const context = getRouteContext(toolResults);
    const replyMarkup = context ? buildRouteKeyboard(context, replyLanguage) : undefined;
    await sendRichMessageWithPhotos(this.bot, chatId, message, images, replyMarkup ? { reply_markup: replyMarkup } : {});
    return message;
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(ctx);
    const menuAction = data ? parseMenuCallbackData(data) : null;
    if (chatId && menuAction) {
      await this.menuActionHandler(ctx, menuAction).catch(async (err) => {
        this.logger.error(`menuActionHandler failed: ${getErrorMessage(err)}`);
        await ctx.answerCallbackQuery().catch(() => {});
      });
      return;
    }
    await ctx.answerCallbackQuery().catch(() => {});

    const wakeRequest = data ? parseWakeCallbackData(data) : null;
    if (chatId && wakeRequest) {
      await this.wakeCallbackHandler(ctx, chatId, wakeRequest, userDetails);
      return;
    }

    const request = data ? parseCallbackData(data) : null;
    if (!chatId || !request) return;
    const language = (await getUserLanguagePreference(chatId)) ?? request.language;
    if (await this.isRateLimited(ctx, language)) return;
    if (request.action === 'stops') {
      await this.showStops(ctx, chatId, { ...request, language }, userDetails);
      return;
    }

    if (request.action === 'where') {
      await this.trainMapHandler(ctx, { ...request, language }, data, userDetails);
      return;
    }

    const action = CALLBACK_ACTIONS[request.action];
    const isRefresh = request.action === 'refresh';
    const { fromStationId, toStationId } = request;
    const nowLocal = getLocalNow();
    const { date, time } = isRefresh ? getRefreshSearchTime(request.date, request.time, nowLocal) : request;
    const question = `[button] ${fromStationId} → ${toStationId} at ${date} ${time}`;
    try {
      const result = await this.railService.searchRoute(fromStationId, toStationId, date, time, language);
      if (!result || !result.context.trains.length) {
        await ctx.reply(MESSAGES.noTrains[language]);
        notifyConversation(action, question, MESSAGES.noTrains[language], userDetails);
        return;
      }
      const answer = appendSourceFooter(formatRouteMessage(result.context, result.railWebsiteUrl, language), ['israel-rail'], format(nowLocal, 'HH:mm'), language, isRefresh);
      const photos = result.image ? [{ image: result.image, fileName: ROUTE_IMAGE_FILE_NAME }] : [];
      const keyboard = buildRouteKeyboard(result.context, language);
      if (isRefresh && messageId) {
        await this.editRouteMessage(chatId, messageId, answer, photos, keyboard);
      } else {
        await sendRichMessageWithPhotos(this.bot, chatId, answer, photos, { reply_markup: keyboard });
      }
      notifyConversation(action, `[button] ${result.context.from.nameEn} → ${result.context.to.nameEn} at ${date} ${time}`, answer, userDetails);
    } catch (err) {
      this.logger.error(`callbackQueryHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[language]);
      notifyConversation(action, question, `${MESSAGES.error[language]} (${getErrorMessage(err)})`, userDetails);
    }
  }

  private async showStops(ctx: Context, chatId: number, request: RailSearchRequest, userDetails: UserDetails): Promise<void> {
    const { fromStationId, toStationId, date, time, language } = request;
    const question = `[button] stops of ${fromStationId} → ${toStationId} at ${date} ${time}`;
    try {
      const travel = await this.railService.findTrain(fromStationId, toStationId, date, time);
      const answer = travel ? formatStopsMessage(travel, language) : MESSAGES.trainNotFound[language];
      await sendRichMessage(this.bot, chatId, answer);
      notifyConversation('SHOW_STOPS', question, answer, userDetails);
    } catch (err) {
      this.logger.error(`showStops failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[language]);
      notifyConversation('SHOW_STOPS', question, `${MESSAGES.error[language]} (${getErrorMessage(err)})`, userDetails);
    }
  }

  // Rebuilds the rich message (route image + text) the button lives on; falls back to a plain Markdown edit if the rich edit is rejected.
  private async editRouteMessage(chatId: number, messageId: number, text: string, photos: readonly RichPhoto[], keyboard: InlineKeyboard): Promise<void> {
    try {
      await this.bot.api.editMessageText(chatId, messageId, buildRichMessageWithPhotos(text, photos), { reply_markup: keyboard }).catch(async (err) => {
        if (isNotModifiedError(err)) throw err;
        this.logger.error(`Rich edit failed, falling back to Markdown: ${getErrorMessage(err)}`);
        await this.bot.api.editMessageText(chatId, messageId, text, { parse_mode: 'Markdown', reply_markup: keyboard });
      });
    } catch (err) {
      // Refreshing twice within the same minute yields identical content, which Telegram rejects.
      if (!isNotModifiedError(err)) throw err;
    }
  }

  private async wakeCallbackHandler(ctx: Context, chatId: number, request: WakeCallbackRequest, userDetails: UserDetails): Promise<void> {
    const { language } = request;
    if (request.action === 'wakecancel') {
      const cancelled = await this.railWakeService.cancelAlert(request.alertId, chatId);
      await ctx.editMessageReplyMarkup().catch(() => {});
      await ctx.reply(cancelled ? MESSAGES.wakeCancelled[language] : MESSAGES.wakeAlreadyHandled[language]);
      if (cancelled) notify(BOT_CONFIG, { action: 'WAKE_ALERT_CANCELLED' }, userDetails);
      return;
    }
    if (await this.isRateLimited(ctx, language)) return;

    const { fromStationId, toStationId, date, time } = request;
    try {
      if (request.action === 'wake') {
        const result = await this.railService.searchRoute(fromStationId, toStationId, date, time, language);
        if (!result || !result.context.trains.length) {
          await ctx.reply(MESSAGES.noTrains[language]);
          return;
        }
        await ctx.reply(MESSAGES.wakePickTrain[language], { reply_markup: buildWakeTrainPickerKeyboard(result.context.trains, fromStationId, toStationId, language) });
        return;
      }

      const result = await this.railWakeService.setAlert({ chatId, fromStationId, toStationId, date, departureTime: time, language });
      await ctx.editMessageReplyMarkup().catch(() => {});
      if (result.status === 'not_found') {
        await ctx.reply(MESSAGES.wakeTrainNotFound[language]);
        return;
      }
      if (result.status === 'too_late') {
        await ctx.reply(MESSAGES.wakeTooLate[language]);
        return;
      }
      const answer = formatWakeConfirmation(result.station, result.notifyAt, result.predictedArrivalAt, language);
      await ctx.reply(answer, { reply_markup: buildWakeCancelKeyboard(result.alertId, language) });
      notifyConversation('WAKE_ALERT_SET', `[button] ${fromStationId} → ${toStationId} at ${date} ${time}`, answer, userDetails);
    } catch (err) {
      this.logger.error(`wakeCallbackHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[language]);
    }
  }

  private async trainMapHandler(ctx: Context, request: RailSearchRequest, callbackData: string, userDetails: UserDetails): Promise<void> {
    const { language, trainNumber } = request;
    const question = `[button] where is train ${trainNumber} (${request.fromStationId} → ${request.toStationId} at ${request.date} ${request.time})`;
    try {
      const result = await this.railService.getTrainMap(request);
      if (!result) {
        await ctx.reply(MESSAGES.trainNotFound[language]);
        notifyConversation('TRAIN_MAP', question, MESSAGES.trainNotFound[language], userDetails);
        return;
      }
      const replyMarkup = buildInlineKeyboard([{ text: MESSAGES.refreshTrainMap[language], data: callbackData }]);
      await ctx.replyWithPhoto(new InputFile(result.image, 'rail-train-map.png'), { caption: result.caption, reply_markup: replyMarkup });
      notifyConversation('TRAIN_MAP', question, result.caption, userDetails);
    } catch (err) {
      this.logger.error(`trainMapHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[language]);
      notifyConversation('TRAIN_MAP', question, `${MESSAGES.error[language]} (${getErrorMessage(err)})`, userDetails);
    }
  }
}
