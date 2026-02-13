import { InlineKeyboard } from 'grammy';

type InlineKeyboardButtonData = {
  readonly text: string;
  readonly data: string;
};

export function buildInlineKeyboard(buttons: InlineKeyboardButtonData[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  buttons.forEach((button) => keyboard.text(button.text, button.data).row());
  return keyboard;
}