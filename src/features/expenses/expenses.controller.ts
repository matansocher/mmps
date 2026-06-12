import type { Bot, Context } from 'grammy';
import { Logger } from '@core/utils';
import { getMessageData } from '@services/telegram';
import { ExpensesLauncherService } from './launcher.service';

export class ExpensesController {
  private readonly logger = new Logger(ExpensesController.name);

  constructor(
    private readonly bot: Bot,
    private readonly launcher: ExpensesLauncherService,
  ) {}

  init(): void {
    this.bot.command('start', (ctx) => this.startHandler(ctx));
  }

  private async startHandler(ctx: Context): Promise<void> {
    const { chatId } = getMessageData(ctx);
    await this.launcher.sendLauncher(chatId);
  }
}
