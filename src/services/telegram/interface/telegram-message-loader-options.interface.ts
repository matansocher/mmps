import { BOT_BROADCAST_ACTIONS } from '../constants';

export interface MessageLoaderOptions {
  readonly loaderEmoji?: string;
  readonly cycleDuration?: number;
  readonly loadingAction?: BOT_BROADCAST_ACTIONS;
}
