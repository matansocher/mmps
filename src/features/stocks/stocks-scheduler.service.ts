import type TelegramBot from 'node-telegram-bot-api';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DEFAULT_TIMEZONE } from '@core/config';
import { NotifierService } from '@core/notifier';
import { BLOCKED_ERROR, sendShortenedMessage } from '@services/telegram';
import { getActiveSubscriptions, getUserDetails, updateSubscription } from '@shared/stocks/mongo';
import { ANALYTIC_EVENT_NAMES, BOT_CONFIG } from './stocks.config';
import { StocksService } from './stocks.service';

const HOURS_TO_NOTIFY = [9, 16];

@Injectable()
export class StocksBotSchedulerService implements OnModuleInit {
  constructor(
    private readonly stocksService: StocksService,
    private readonly notifier: NotifierService,
    @Inject(BOT_CONFIG.id) private readonly bot: TelegramBot,
  ) {}

  onModuleInit(): void {
    setTimeout(() => {
      // this.handleDailyPortfolioUpdate(); // for testing purposes
    }, 8000);
  }

  @Cron(`0 ${HOURS_TO_NOTIFY.join(',')} * * 1-5`, { name: 'stocks-scheduler', timeZone: DEFAULT_TIMEZONE })
  async handleDailyPortfolioUpdate(): Promise<void> {
    try {
      const subscriptions = await getActiveSubscriptions();
      if (!subscriptions?.length) {
        return;
      }

      for (const { chatId } of subscriptions) {
        try {
          const portfolioStatus = await this.stocksService.getPortfolioStatus(chatId);

          if (portfolioStatus.holdings.length === 0) {
            continue;
          }

          const message = [
            `📊 *Daily Portfolio Update*`,
            ``,
            `💰 Balance: $${portfolioStatus.balance.toFixed(2)}`,
            `📈 Total Value: $${portfolioStatus.totalCurrentValue.toFixed(2)}`,
            `${portfolioStatus.totalProfitLoss >= 0 ? '📈' : '📉'} P/L: $${portfolioStatus.totalProfitLoss.toFixed(2)} (${portfolioStatus.totalProfitLossPercent.toFixed(2)}%)`,
            ``,
            `Use /status to see detailed holdings`,
          ].join('\n');

          await sendShortenedMessage(this.bot, chatId, message, { parse_mode: 'Markdown' });
        } catch (err) {
          const userDetails = await getUserDetails(chatId);
          if (err.message.includes(BLOCKED_ERROR)) {
            await updateSubscription(chatId, { isActive: false });
            this.notifier.notify(BOT_CONFIG, { action: ANALYTIC_EVENT_NAMES.ERROR, userDetails, error: BLOCKED_ERROR });
          } else {
            this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, userDetails, error: err });
          }
        }
      }
    } catch (err) {
      this.notifier.notify(BOT_CONFIG, { action: `cron - ${ANALYTIC_EVENT_NAMES.ERROR}`, error: err });
    }
  }
}
