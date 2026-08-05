import { InlineKeyboard } from 'grammy';

export const BIRTHDAY_ACTION_PREFIX = 'birthday';

export type BirthdayAction = 'draft';

export function buildBirthdayCallbackData(action: BirthdayAction): string {
  return [BIRTHDAY_ACTION_PREFIX, action].join(':');
}

export function parseBirthdayCallbackData(data: string): BirthdayAction | null {
  const [prefix, action] = data.split(':');
  if (prefix !== BIRTHDAY_ACTION_PREFIX || action !== 'draft') {
    return null;
  }
  return action;
}

export function buildBirthdayKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('🎉 Draft a message', buildBirthdayCallbackData('draft'));
}
