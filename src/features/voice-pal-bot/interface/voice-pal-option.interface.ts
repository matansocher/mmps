import type { BOT_BROADCAST_ACTIONS, POSSIBLE_INPUTS } from '@services/telegram';

export interface VoicePalOption {
  readonly analyticsEventName: string;
  readonly displayName: string;
  readonly handler?: string;
  readonly hideFromKeyboard?: boolean;
  readonly loaderType?: BOT_BROADCAST_ACTIONS;
  readonly possibleInputs?: POSSIBLE_INPUTS[];
  readonly selectedActionResponse: string;
  readonly showLoader?: boolean;
}
