import { type Bot, type Context, InputFile } from 'grammy';
import { MY_USER_ID, WIFE_USER_ID } from '@core/config/main.config';
import { getErrorMessage, Logger } from '@core/utils';
import { buildToolImages, RAIL_ROUTE_IMAGE_BUILDER } from '@features/chatbot/tool-images';
import { notify } from '@services/notifier';
import { applyAllowlist, getCallbackQueryData, getMessageData, MessageLoader, sendRichMessage } from '@services/telegram';
import { detectLanguage } from '@shared/image-card';
import { BOT_CONFIG, START_MESSAGE, UNAUTHORIZED_MESSAGE } from './rail.config';
import { RailService } from './rail.service';
import { buildRouteKeyboard, formatRouteMessage, getRouteContext, parseCallbackData } from './rail.utils';

export class RailController {
  private readonly logger = new Logger(RailController.name);

  constructor(
    private readonly railService: RailService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    applyAllowlist(this.bot, [MY_USER_ID, WIFE_USER_ID], {
      denyMessage: UNAUTHORIZED_MESSAGE,
      onDeny: (userDetails) => notify(BOT_CONFIG, { action: 'BLOCKED_MESSAGE' }, userDetails),
    });
    this.bot.command(BOT_CONFIG.commands.START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
    this.bot.on('callback_query:data', (ctx) => this.callbackQueryHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { userDetails } = getMessageData(ctx);
    await ctx.reply(START_MESSAGE);
    notify(BOT_CONFIG, { action: 'START' }, userDetails);
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text, userDetails } = getMessageData(ctx);
    notify(BOT_CONFIG, { action: 'MESSAGE', message: text }, userDetails);

    const messageLoader = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '⚡' });
    await messageLoader.handleMessageWithLoader(async () => {
      const { message, toolResults } = await this.railService.processMessage(text, chatId);

      const images = await buildToolImages(toolResults, message, [RAIL_ROUTE_IMAGE_BUILDER]);
      for (const { fileName, image } of images) {
        await ctx.replyWithPhoto(new InputFile(image, fileName)).catch((err) => this.logger.error(`Failed to send route image: ${getErrorMessage(err)}`));
      }

      const context = getRouteContext(toolResults);
      const replyMarkup = context ? buildRouteKeyboard(context, detectLanguage(message)) : undefined;
      await sendRichMessage(this.bot, chatId, message, replyMarkup ? { reply_markup: replyMarkup } : {});
    });
  }

  private async callbackQueryHandler(ctx: Context): Promise<void> {
    const { chatId, data, userDetails } = getCallbackQueryData(ctx);
    await ctx.answerCallbackQuery().catch(() => {});

    const request = data ? parseCallbackData(data) : null;
    if (!chatId || !request) return;
    notify(BOT_CONFIG, { action: request.action === 'later' ? 'LATER_TRAINS' : 'REVERSE_DIRECTION' }, userDetails);

    try {
      const { fromStationId, toStationId, date, time, language } = request;
      const result = await this.railService.searchRoute(fromStationId, toStationId, date, time, language);
      if (!result || !result.context.trains.length) {
        await ctx.reply(language === 'he' ? 'לא מצאתי רכבות לחיפוש הזה 🤷' : 'No trains found for this search 🤷');
        return;
      }
      if (result.image) {
        await ctx.replyWithPhoto(new InputFile(result.image, 'rail-route.png'));
      }
      await sendRichMessage(this.bot, chatId, formatRouteMessage(result.context, result.railWebsiteUrl, language), { reply_markup: buildRouteKeyboard(result.context, language) });
    } catch (err) {
      this.logger.error(`callbackQueryHandler failed: ${getErrorMessage(err)}`);
      await ctx.reply(request.language === 'he' ? 'משהו השתבש, נסו שוב בעוד רגע 🙏' : 'Something went wrong, please try again 🙏');
    }
  }
}
