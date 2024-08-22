import { Injectable } from '@nestjs/common';
import { ITelegramMessageData } from '@services/telegram/interface';
import { POSSIBLE_INPUTS } from '@services/telegram/telegram.config';
import { IVoicePalOption } from '@services/voice-pal/interface';
import { VOICE_PAL_OPTIONS } from './voice-pal.config';

@Injectable()
export class VoicePalUtilsService {
  getKeyboardOptions() {
    const options = {};
    for (const key in VOICE_PAL_OPTIONS) {
      if (VOICE_PAL_OPTIONS[key].hideFromKeyboard !== true) {
        options[key] = VOICE_PAL_OPTIONS[key];
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

  validateActionWithMessage(userAction: IVoicePalOption, messageParams: Partial<ITelegramMessageData>): string | void {
    const { possibleInputs } = userAction;

    const messageParamsExistenceMap = {};
    Object.keys(POSSIBLE_INPUTS).forEach((possibleInputKey: string) => {
      messageParamsExistenceMap[possibleInputKey.toLowerCase()] = !!messageParams[POSSIBLE_INPUTS[possibleInputKey]];
    });

    let isValid = false;
    for (const possibleInput of possibleInputs) {
      isValid = isValid || messageParamsExistenceMap[possibleInput];
    }

    if (!isValid) {
      return `For this action you must pass one of these types of input: [${possibleInputs.join(', ')}]`;
    }
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
