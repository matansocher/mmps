import { PinBuddyMongoPinService } from '@core/mongo/pin-buddy/services';
import { PinModel } from '@core/mongo/shared/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PinBuddyUtilsService {
  constructor(private readonly mongoPinService: PinBuddyMongoPinService) {}

  async getKeyboardOptions(chatId: number) {
    const chatPins = await this.mongoPinService.getPins(chatId);

    if (!chatPins?.length) {
      return {
        reply_markup: { keyboard: [], resize_keyboard: true },
      };
    }

    return {
      reply_markup: {
        keyboard: chatPins.map((pin: PinModel) => {
          return [{ text: `${pin.messageId} - ${pin.title}` }];
        }),
        resize_keyboard: true,
      },
    };
  }

  isStringParsableToInt(str) {
    return !isNaN(str) && parseInt(str) == parseFloat(str);
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
