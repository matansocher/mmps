import { Injectable } from '@nestjs/common';
import { WOLT_BOT_OPTIONS } from './wolt.config';

@Injectable()
export class WoltUtilsService {
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
