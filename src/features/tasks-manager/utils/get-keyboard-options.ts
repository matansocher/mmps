import { TASKS_MANAGER_BOT_OPTIONS } from '../tasks-manager-bot.config';

export function getKeyboardOptions() {
  return {
    reply_markup: {
      keyboard: Object.keys(TASKS_MANAGER_BOT_OPTIONS).map((option) => {
        return [{ text: TASKS_MANAGER_BOT_OPTIONS[option] }];
      }),
      resize_keyboard: true,
    },
  };
}
