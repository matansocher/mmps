import type { Bot, Context } from 'grammy';
import { Logger } from '@core/utils';
import { getMessageData } from '@services/telegram';
import { upsertStackerUser } from '@shared/stacker';
import { BOT_CONFIG } from './stacker.config';
import { StackerLauncherService } from './launcher.service';

export class StackerController {
  private readonly logger = new Logger(StackerController.name);

  constructor(
    private readonly launcher: StackerLauncherService,
    private readonly bot: Bot,
  ) {}

  init(): void {
    const { START, PLAY } = BOT_CONFIG.commands;
    this.bot.command(START.command.replace('/', ''), (ctx) => this.startHandler(ctx));
    this.bot.command(PLAY.command.replace('/', ''), (ctx) => this.playHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId, userDetails } = getMessageData(ctx);
    await upsertStackerUser(chatId, userDetails.telegramUserId, userDetails.username);
    const intro = [
      '👋 *Welcome to Stacker* — bite-sized programming practice.',
      '',
      '🎯 6 topics · 3 levels · 5 questions per round',
      '❤️ 3 hearts a day · 🔥 build a streak by playing daily',
      '',
      'Tap below to play.',
    ].join('\n');
    await this.launcher.sendLauncher(chatId, { intro });
  }

  private async playHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    await this.launcher.sendLauncher(chatId);
  }
}
