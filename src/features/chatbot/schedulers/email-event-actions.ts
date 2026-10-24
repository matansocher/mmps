import { InlineKeyboard } from 'grammy';

export const EMAIL_EVENT_ACTION_PREFIX = 'emailevent';

export type EmailEventAction = 'add' | 'dismiss';

export type ParsedEmailEventCallback = {
  readonly action: EmailEventAction;
  readonly emailEventId: string;
};

export function buildEmailEventCallbackData(action: EmailEventAction, emailEventId: string): string {
  return [EMAIL_EVENT_ACTION_PREFIX, action, emailEventId].join(':');
}

export function parseEmailEventCallbackData(data: string): ParsedEmailEventCallback | null {
  const [prefix, action, emailEventId] = data.split(':');
  if (prefix !== EMAIL_EVENT_ACTION_PREFIX || !emailEventId || (action !== 'add' && action !== 'dismiss')) {
    return null;
  }
  return { action, emailEventId };
}

export function buildEmailEventKeyboard(emailEventId: string): InlineKeyboard {
  return new InlineKeyboard().text('✅ Add to calendar', buildEmailEventCallbackData('add', emailEventId)).text('❌ Dismiss', buildEmailEventCallbackData('dismiss', emailEventId));
}
