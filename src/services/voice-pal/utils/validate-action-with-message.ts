import { IVoicePalOption } from '../interface';
import { ITelegramMessageData, POSSIBLE_INPUTS } from '@services/telegram';

export function validateActionWithMessage(userAction: IVoicePalOption, messageParams: Partial<ITelegramMessageData>): string | void {
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
