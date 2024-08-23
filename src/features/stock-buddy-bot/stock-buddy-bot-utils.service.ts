import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
  WOLT_BOT_OPTIONS,
} from '@services/wolt/wolt.config';

@Injectable()
export class StockBuddyBotUtilsService {
  getKeyboardOptions() {
    return {
      reply_markup: {
        keyboard: Object.keys(WOLT_BOT_OPTIONS).map(option => {
          return [{ text: WOLT_BOT_OPTIONS[option] }];
        }),
        resize_keyboard: true,
      },
    };
  }
}
