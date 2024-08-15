import { BOT_BROADCAST_ACTIONS } from '../telegram.config';

export interface MessageLoaderOptions {
  cycleDuration?: number;
  loadingAction: BOT_BROADCAST_ACTIONS;
}
