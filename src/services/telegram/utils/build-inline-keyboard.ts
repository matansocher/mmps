import { InlineKeyboard } from 'grammy';
import { chunk } from '@core/utils';

type InlineKeyboardButtonData = {
  readonly text: string;
  readonly data: string;
};

export function buildInlineKeyboard(buttons: InlineKeyboardButtonData[], columnsPerRow: number = 1): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const rows = chunk(buttons, columnsPerRow);
  rows.forEach((row) => {
    row.forEach((button) => keyboard.text(button.text, button.data));
    keyboard.row();
  });
  return keyboard;
}