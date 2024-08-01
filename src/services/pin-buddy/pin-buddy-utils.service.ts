import { Injectable } from '@nestjs/common';
import { PIN_BUDDY_OPTIONS } from '@services/pin-buddy/pin-buddy.config';

@Injectable()
export class PinBuddyUtilsService {
  getKeyboardOptions() {
    const options = {};
    for (const key in PIN_BUDDY_OPTIONS) {
      if (PIN_BUDDY_OPTIONS[key].hideFromKeyboard !== true) {
        options[key] = PIN_BUDDY_OPTIONS[key];
      }
    }

    return {
      reply_markup: {
        keyboard: Object.keys(options).map((option) => {
          return [{ text: options[option].displayName }];
        }),
        resize_keyboard: true,
      },
    };
  }
}
