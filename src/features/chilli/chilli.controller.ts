import { ChatOpenAI } from '@langchain/openai';
import type { Bot, Context } from 'grammy';
import { env } from 'node:process';
import { isProd, MY_USER_ID } from '@core/config/main.config';
import { Logger } from '@core/utils';
import { notify } from '@services/notifier';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { getMessageData, MessageLoader, sendStyledMessage } from '@services/telegram';
import { BOT_CONFIG } from './chilli.config';
import { ChilliService } from './chilli.service';
import { getPrompt, insertPromptVersion } from './mongo';

const CONSOLIDATION_PROMPT = `אתה עוזר שמעדכן פרומפט של בוט AI שמתחזה לחתולה בשם צ'ילי.

אתה מקבל:
1. הפרומפט הנוכחי
2. עדכון חדש שצריך לשלב בפרומפט

המשימה שלך: שלב את העדכון החדש בפרומפט הקיים בצורה טבעית. הוסף את המידע החדש בסעיף המתאים (אישיות, הרגלים, מערכות יחסים, שגרה וכו'). אל תמחק מידע קיים אלא אם העדכון החדש סותר אותו. שמור על אותו סגנון כתיבה.

החזר רק את הפרומפט המעודכן, בלי הסברים נוספים.`;

export class ChilliController {
  private readonly logger = new Logger(ChilliController.name);

  constructor(
    private readonly chilliService: ChilliService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.command('update', (ctx) => this.updateHandler(ctx));
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
  }

  private async updateHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text } = getMessageData(ctx);

    if (chatId !== MY_USER_ID) {
      await ctx.reply('רק גוז יכול לעדכן אותי 😾');
      return;
    }

    const updateText = text.replace('/update', '').trim();
    if (!updateText) {
      await ctx.reply('תכתוב משהו אחרי /update יא עצלן');
      return;
    }

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '🤔' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const currentPrompt = await getPrompt();
      if (!currentPrompt) {
        await ctx.reply('אין פרומפט בדאטהבייס. תריץ את סקריפט ה-seed קודם.');
        return;
      }

      const model = new ChatOpenAI({ model: GPT_SMALL_MODEL, apiKey: env.OPENAI_API_KEY }); // temperature: 0.2
      const response = await model.invoke([
        { role: 'system', content: CONSOLIDATION_PROMPT },
        { role: 'user', content: `הפרומפט הנוכחי:\n${currentPrompt}\n\nעדכון חדש:\n${updateText}` },
      ]);

      const updatedPrompt = response.content as string;
      await insertPromptVersion(updatedPrompt);

      await ctx.reply(`עודכן ✅`);
      this.logger.log(`Prompt updated by Guz`);
    });
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { chatId: rawChatId, messageId, text, userDetails, isGroup } = getMessageData(ctx);
    const chatId = userDetails?.telegramUserId || rawChatId;
    const senderName = userDetails?.firstName || 'unknown';
    const isBotTagged = text.includes(`@${ctx.me.username}`);
    const threadId = isProd ? rawChatId.toString() : `dev-${rawChatId.toString()}`;

    if (isGroup && !isBotTagged) {
      await this.chilliService.addToHistory(text, senderName, threadId);
      return;
    }

    const cleanText = text.replace(`@${ctx.me.username}`, '').trim();

    notify(BOT_CONFIG, { action: 'MESSAGE', message: cleanText }, userDetails);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '😁' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const replyText = await this.chilliService.processMessage(cleanText || text, chatId, threadId);
      ctx.reply(replyText);

      notify(BOT_CONFIG, { action: 'REPLY', message: replyText }, userDetails);
    });
  }
}
