import { BOT_BROADCAST_ACTIONS } from '@core/config/telegram.config';
import { POSSIBLE_INPUTS } from '@services/voice-pal/voice-pal.config';

export interface IVoicePalOption {
  analyticsEventName: string;
  displayName: string;
  handler: string;
  hideFromKeyboard: boolean;
  loaderType: BOT_BROADCAST_ACTIONS;
  possibleInputs: POSSIBLE_INPUTS[];
  selectedActionResponse: string;
  showLoader: boolean;
}
