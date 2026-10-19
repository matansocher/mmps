import { type Bot, type Context, InputFile } from 'grammy';
import { LOCAL_FILES_PATH } from '@core/config';
import { createRateLimitCounter } from '@core/express';
import { deleteFile, getErrorMessage, Logger } from '@core/utils';
import { buildToolImages, RAIL_ROUTE_IMAGE_BUILDER } from '@features/chatbot/tool-images';
import { notify } from '@services/notifier';
import { getTranscriptFromAudio } from '@services/openai/utils/get-transcript-from-audio';
import { downloadFile, getCallbackQueryData, getMessageData, MessageLoader, sendRichMessage } from '@services/telegram';
import { detectLanguage, type ImageLanguage } from '@shared/image-card';
import { BOT_CONFIG, BOT_PROFILE, MESSAGES, RAIL_LIMITS, START_MESSAGE } from './rail.config';
import { RailService } from './rail.service';
import { buildRouteKeyboard, formatRouteMessage, getRouteContext, getUserLanguage, parseCallbackData } from './rail.utils';

const GLOBAL_KEY = 'all';

export class RailController {
  private readonly logger = new Logger(RailController.name);
  private readonly hitUserLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.userWindowMs, prefix: 'rail-bot:user' });
  private readonly hitGlobalLimit = createRateLimitCounter({ windowMs: RAIL_LIMITS.globalWindowMs, prefix: 'rail-bot:global' });

  constructor(
    private readonly railService: RailService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command(BOT_CONFIG.commands.START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.on('message:text', (ctx) => this.textHandler(ctx));
    this.bot.on(['message:voice', 'message:audio'], (ctx) => this.audioHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
    this.syncBotProfile().catch((err) => this.logger.error(`Failed to set bot profile: ${getErrorMessage(err)}`));
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

  private async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    await ctx.reply(START_MESSAGE);
    notify(BOT_CONFIG, { action: 'START' }, userDetails);
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
    notify(BOT_CONFIG, { action: 'MESSAGE', message: text }, userDetails);

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(() => this.answerQuery(ctx, chatId, text, language));
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
        return;
      }
      notify(BOT_CONFIG, { action: 'VOICE_MESSAGE', message: transcript }, userDetails);
      await this.answerQuery(ctx, chatId, transcript, detectLanguage(transcript));
    });
  }

  private async answerQuery(ctx: Context, chatId: number, text: string, language: ImageLanguage): Promise<void> {
    const { message, toolResults } = await this.railService.processMessage(text, chatId, language);

    const images = await buildToolImages(toolResults, message, [RAIL_ROUTE_IMAGE_BUILDER]);
    for (const { fileName, image } of images) {
      await ctx.replyWithPhoto(new InputFile(image, fileName)).catch((err) => this.logger.error(`Failed to send route image: ${getErrorMessage(err)}`));
    }

    const context = getRouteContext(toolResults);
    const replyMarkup = context ? buildRouteKeyboard(context, detectLanguage(message)) : undefined;
    await sendRichMessage(this.bot, chatId, message, replyMarkup ? { reply_markup: replyMarkup } : {});
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, data, userDetails } = getCallbackQueryData(ctx);
    await ctx.answerCallbackQuery().catch(() => {});

    const request = data ? parseCallbackData(data) : null;
    if (!chatId || !request) return;
    if (await this.isRateLimited(ctx, request.language)) return;
    notify(BOT_CONFIG, { action: request.action === 'later' ? 'LATER_TRAINS' : 'REVERSE_DIRECTION' }, userDetails);

    try {
      const { fromStationId, toStationId, date, time, language } = request;
      const result = await this.railService.searchRoute(fromStationId, toStationId, date, time, language);
      if (!result || !result.context.trains.length) {
        await ctx.reply(MESSAGES.noTrains[language]);
        return;
      }
      if (result.image) {
        await ctx.replyWithPhoto(new InputFile(result.image, 'rail-route.png'));
      }
      await sendRichMessage(this.bot, chatId, formatRouteMessage(result.context, result.railWebsiteUrl, language), { reply_markup: buildRouteKeyboard(result.context, language) });
    } catch (err) {
      this.logger.error(`callbackQueryHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(MESSAGES.error[request.language]);
    }
  }
}
