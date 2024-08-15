import { Injectable } from '@nestjs/common';
import { ITelegramMessageData } from '@services/telegram';
import { POSSIBLE_INPUTS } from '@services/telegram';
import { IVoicePalOption } from '@services/voice-pal';
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
}
