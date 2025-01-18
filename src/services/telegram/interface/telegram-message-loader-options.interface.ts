import { BOT_BROADCAST_ACTIONS } from '../constants';

export interface MessageLoaderOptions {
  loaderEmoji?: string;
  cycleDuration?: number;
  loadingAction?: BOT_BROADCAST_ACTIONS;
}
