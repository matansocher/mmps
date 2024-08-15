import { BOT_BROADCAST_ACTIONS, POSSIBLE_INPUTS } from '@services/telegram';

export interface IVoicePalOption {
  analyticsEventName: string;
  displayName: string;
  handler?: string;
  hideFromKeyboard?: boolean;
  loaderType?: BOT_BROADCAST_ACTIONS;
  possibleInputs?: POSSIBLE_INPUTS[];
  selectedActionResponse: string;
  showLoader?: boolean;
}
