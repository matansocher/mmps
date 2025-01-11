import { chunk as _chunk } from 'lodash';

export function getInlineKeyboardMarkup(inlineKeyboardButtons: any[], numberOfColumnsPerRow: number = 1): { reply_markup: string } {
  const inlineKeyboard = { inline_keyboard: [] };
  inlineKeyboardButtons.forEach((button) => inlineKeyboard.inline_keyboard.push(button));
  inlineKeyboard.inline_keyboard = _chunk(inlineKeyboard.inline_keyboard, numberOfColumnsPerRow);
  return { reply_markup: JSON.stringify(inlineKeyboard) };
}
