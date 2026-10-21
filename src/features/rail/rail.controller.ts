import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { type Bot, type Context, type InlineKeyboard, InputFile } from 'grammy';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DEFAULT_TIMEZONE, LOCAL_FILES_PATH } from '@core/config';
import { createRateLimitCounter } from '@core/express';
import { deleteFile, getErrorMessage, Logger } from '@core/utils';
import { buildToolImages, RAIL_ROUTE_IMAGE_BUILDER } from '@features/chatbot/tool-images';
import { notify } from '@services/notifier';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import {
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
import { getAvatarHash, saveAvatarHash, saveUserDetails } from './mongo';
import { BOT_CONFIG, BOT_PROFILE, MESSAGES, RAIL_LIMITS, START_MESSAGE } from './rail.config';
import { RailService } from './rail.service';
import {
  appendSourceFooter,
  buildRouteKeyboard,
  formatRouteMessage,
  formatStopsMessage,
  getAnswerSources,
  getRefreshSearchTime,
  getRouteContext,
  getUserLanguage,
  parseCallbackData,
  type RailSearchAction,
  type RailSearchRequest,
} from './rail.utils';
import type { RailWakeService } from './rail-wake.service';
import { buildWakeCancelKeyboard, buildWakeTrainPickerKeyboard, formatWakeConfirmation, parseWakeCallbackData, type WakeCallbackRequest } from './rail-wake.utils';

const GLOBAL_KEY = 'all';
const AVATAR_PATH = resolve(process.cwd(), 'assets/images/rail/avatar.png');
const ROUTE_IMAGE_FILE_NAME = 'rail-route.png';

const CALLBACK_ACTIONS: Record<Exclude<RailSearchAction, 'stops'>, string> = { later: 'LATER_TRAINS', reverse: 'REVERSE_DIRECTION', refresh: 'REFRESH' };

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

  constructor(
    private readonly railService: RailService,
    private readonly railWakeService: RailWakeService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command(BOT_CONFIG.commands.START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on(['message:voice', 'message:audio'], (ctx) => this.audioHandler(ctx));
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
    const language = detectLanguage(text);
    if (await this.isRateLimited(ctx, language)) return;

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      const answer = await this.answerQuery(chatId, text, language);
      notifyConversation('MESSAGE', text, answer, userDetails);
    });
  }

  private async audioHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, audio, userDetails } = getMessageData(ctx);
    const fallbackLanguage = getUserLanguage(ctx.from?.language_code);
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
      const answer = await this.answerQuery(chatId, transcript, detectLanguage(transcript));
      notifyConversation('VOICE_MESSAGE', transcript, answer, userDetails);
    });
  }

  private async answerQuery(chatId: number, text: string, language: ImageLanguage): Promise<string> {
    const { message: reply, toolResults } = await this.railService.processMessage(text, chatId, language);
    const message = appendSourceFooter(reply, getAnswerSources(toolResults), format(getLocalNow(), 'HH:mm'), detectLanguage(reply));

    const images = await buildToolImages(toolResults, message, [RAIL_ROUTE_IMAGE_BUILDER]);
    const context = getRouteContext(toolResults);
    const replyMarkup = context ? buildRouteKeyboard(context, detectLanguage(message)) : undefined;
    await sendRichMessageWithPhotos(this.bot, chatId, message, images, replyMarkup ? { reply_markup: replyMarkup } : {});
    return message;
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, data, userDetails } = getCallbackQueryData(ctx);
    await ctx.answerCallbackQuery().catch(() => {});

    const wakeRequest = data ? parseWakeCallbackData(data) : null;
    if (chatId && wakeRequest) {
      await this.wakeCallbackHandler(ctx, chatId, wakeRequest, userDetails);
      return;
    }

    const request = data ? parseCallbackData(data) : null;
    if (!chatId || !request) return;
    if (await this.isRateLimited(ctx, request.language)) return;
    if (request.action === 'stops') {
      await this.showStops(ctx, chatId, request, userDetails);
      return;
    }

    const action = CALLBACK_ACTIONS[request.action];
    const isRefresh = request.action === 'refresh';
    const { fromStationId, toStationId, language } = request;
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
}
