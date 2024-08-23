import { Injectable } from '@nestjs/common';
import { StockDataSummary } from '@services/stock-buddy/interface';
import { STOCK_BUDDY_BOT_OPTIONS } from './stock-buddy-bot.config';

@Injectable()
export class StockBuddyBotUtilsService {
  getKeyboardOptions() {
    return {
      reply_markup: {
        keyboard: Object.keys(STOCK_BUDDY_BOT_OPTIONS).map((option: string) => {
          return [{ text: STOCK_BUDDY_BOT_OPTIONS[option] }];
        }),
        resize_keyboard: true,
      },
    };
  }

  getStockSummaryMessage(stockDataSummary: StockDataSummary): string {
    return `
      *${stockDataSummary.symbol} ${stockDataSummary.longName}*
      [inline URL](https://finance.yahoo.com/quote/${stockDataSummary.symbol}/)
    `.replaceAll('.', '');
  }
}
