import { chunk as _chunk } from 'lodash';
import type { InlineKeyboardButton, InlineKeyboardMarkup } from 'node-telegram-bot-api';

const MAXIMUM_CHARS_FOR_INLINE_KEYBOARD_BUTTON = 64;

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

export function getCustomInlineKeyboardMarkup(inlineKeyboardButtons: InlineKeyboardButton[], columnsPerRow: number[] = [1]): { readonly reply_markup: InlineKeyboardMarkup } {
  const processedButtons = inlineKeyboardButtons.map((button) => {
    if ('callback_data' in button) {
      return {
        text: button.text,
        callback_data: button.callback_data.slice(0, MAXIMUM_CHARS_FOR_INLINE_KEYBOARD_BUTTON),
      };
    }
    return button;
  });

  const inlineKeyboard: InlineKeyboardButton[][] = [];
  let buttonIndex = 0;

  for (const columns of columnsPerRow) {
    if (columns <= 0 || buttonIndex >= processedButtons.length) {
      continue;
    }

    const buttonsInRow = Math.min(columns, processedButtons.length - buttonIndex);
    if (buttonsInRow > 0) {
      inlineKeyboard.push(processedButtons.slice(buttonIndex, buttonIndex + buttonsInRow));
      buttonIndex += buttonsInRow;
    }
  }

  while (buttonIndex < processedButtons.length) {
    inlineKeyboard.push([processedButtons[buttonIndex]]);
    buttonIndex++;
  }

  return { reply_markup: { inline_keyboard: inlineKeyboard } };
}
