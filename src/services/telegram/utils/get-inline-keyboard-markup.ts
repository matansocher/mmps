import { chunk as _chunk } from 'lodash';
import { InlineKeyboardMarkup } from 'node-telegram-bot-api';

const MAXIMUM_CHARS_FOR_INLINE_KEYBOARD_BUTTON = 64;

type InlineKeyboardButton =
  | {
      readonly text: string;
      readonly callback_data: string;
    }
  | {
      readonly text: string;
      readonly url: string;
    };

export function getInlineKeyboardMarkup(inlineKeyboardButtons: InlineKeyboardButton[], numberOfColumnsPerRow: number = 1): { readonly reply_markup: InlineKeyboardMarkup } {
  const processedButtons = inlineKeyboardButtons.map((button) => {
    if ('callback_data' in button) {
      return {
        text: button.text,
        callback_data: button.callback_data.slice(0, MAXIMUM_CHARS_FOR_INLINE_KEYBOARD_BUTTON),
      };
    }
    return button;
  });

  const inlineKeyboard = { inline_keyboard: _chunk(processedButtons, numberOfColumnsPerRow) };
  return { reply_markup: inlineKeyboard };
}
