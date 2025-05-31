import TelegramBot, { CallbackQuery, Message } from 'node-telegram-bot-api';
import { Controller, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { CookerMongoRecipeService } from '@core/mongo/cooker-mongo';
import { getCallbackQueryData, getInlineKeyboardMarkup, getMessageData, registerHandlers, TELEGRAM_EVENTS, TelegramEventHandler } from '@services/telegram';
import { BOT_ACTIONS, BOT_CONFIG } from './cooker.config';
import { generateRecipeString } from './utils';

@Controller('cooker')
export class CookerController implements OnModuleInit {
  private readonly logger = new Logger(CookerController.name);

  constructor(
    private readonly recipeDB: CookerMongoRecipeService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    const { COMMAND, CALLBACK_QUERY } = TELEGRAM_EVENTS;
    const { START, RECIPES } = BOT_CONFIG.commands;
    const handlers: TelegramEventHandler[] = [
      { event: COMMAND, regex: START.command, handler: (message) => this.startHandler.call(this, message) },
      { event: COMMAND, regex: RECIPES.command, handler: (message) => this.recipesHandler.call(this, message) },
      { event: CALLBACK_QUERY, handler: (callbackQuery) => this.callbackQueryHandler.call(this, callbackQuery) },
    ];
    registerHandlers({ bot: this.bot, logger: this.logger, handlers, isBlocked: true });
  }

  async startHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const newUserReplyText = [`שלום 👋`, `אני פה כדי לשמש כספר המתכונים שלך 👨‍🍳`].join('\n\n');
    await this.bot.sendMessage(chatId, newUserReplyText);
  }

  async recipesHandler(message: Message): Promise<void> {
    const { chatId } = getMessageData(message);
    const recipes = await this.recipeDB.getRecipes(chatId);
    const inlineKeyboardButtons = recipes.map((recipe) => {
      const { _id, emoji, title } = recipe;
      return { text: `${title} ${emoji}`, callback_data: `${BOT_ACTIONS.SHOW} - ${_id}` };
    });
    await this.bot.sendMessage(chatId, 'איזה מתכון בא לך?', { ...(getInlineKeyboardMarkup(inlineKeyboardButtons, 2) as any) });
  }

  private async callbackQueryHandler(callbackQuery: CallbackQuery): Promise<void> {
    const { chatId, messageId, data: response } = getCallbackQueryData(callbackQuery);

    const [action, resource] = response.split(' - ');
    switch (action) {
      case BOT_ACTIONS.SHOW:
        await this.showHandler(chatId, resource);
        await this.bot.deleteMessage(chatId, messageId).catch();
        break;
      default:
        throw new Error('Invalid action');
    }
  }

  async showHandler(chatId: number, recipeId: string): Promise<void> {
    const recipe = await this.recipeDB.getRecipe(chatId, recipeId);
    if (!recipe) {
      await this.bot.sendMessage(chatId, 'מתכון לא נמצא');
      return;
    }
    await this.bot.sendMessage(chatId, generateRecipeString(recipe), { parse_mode: 'Markdown' });
  }
}
