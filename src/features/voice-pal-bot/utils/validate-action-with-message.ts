import type { TelegramMessageData } from '@services/telegram';
import { POSSIBLE_INPUTS } from '@services/telegram';
import type { VoicePalOption } from '../interface';

export function validateActionWithMessage(userAction: VoicePalOption, messageParams: Partial<TelegramMessageData>): string {
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
