import { InlineKeyboardMarkup } from 'node-telegram-bot-api';

export function removeItemFromInlineKeyboardMarkup(inlineKeyboardMarkup: InlineKeyboardMarkup, searchQuery: string): InlineKeyboardMarkup {
  return {
    ...inlineKeyboardMarkup,
    inline_keyboard: inlineKeyboardMarkup.inline_keyboard.map((arr) => arr.filter((item) => !item.callback_data.includes(searchQuery))).filter((arr) => arr.length > 0),
  };
}
