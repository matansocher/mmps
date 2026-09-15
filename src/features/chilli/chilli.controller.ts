import type { Bot, Context } from 'grammy';
import { notify } from '@services/notifier';
import { getMessageData, MessageLoader } from '@services/telegram';
import { BOT_CONFIG } from './chilli.config';
import { ChilliService } from './chilli.service';

export class ChilliController {
  constructor(
    private readonly chilliService: ChilliService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    this.bot.on('message:text', (ctx) => this.messageHandler(ctx));
  }

  private async messageHandler(ctx: Context): Promise<void> {
    const { chatId, messageId, text, userDetails } = getMessageData(ctx);

    notify(BOT_CONFIG, { action: 'MESSAGE', message: text }, userDetails);

    const messageLoaderService = new MessageLoader(this.bot, chatId, messageId, { reactionEmoji: '😁' });
    await messageLoaderService.handleMessageWithLoader(async () => {
      const replyText = await this.chilliService.processMessage(text, chatId);
      await ctx.reply(replyText);

      notify(BOT_CONFIG, { action: 'REPLY', message: replyText }, userDetails);
    });
  }
}
