import type { InlineKeyboardMarkup } from 'grammy/types';

export function removeItemFromInlineKeyboardMarkup(inlineKeyboardMarkup: InlineKeyboardMarkup, searchQuery: string): InlineKeyboardMarkup {
  return {
    ...inlineKeyboardMarkup,
    inline_keyboard: inlineKeyboardMarkup.inline_keyboard.map((arr) => arr.filter((item) => !('callback_data' in item && item.callback_data?.includes(searchQuery)))).filter((arr) => arr.length > 0),
  };
}
