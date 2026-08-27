import type { Bot } from 'grammy';
import type { InputRichBlock, InputRichBlockButtons, Message, RichMessageButton } from 'grammy/types';
import { chunk } from '@core/utils';

export type RichButtonData = {
  readonly text: string;
  readonly data: string;
  readonly style?: 'danger' | 'success' | 'primary' | 'link';
};

export function buildRichButtonRows(buttons: RichButtonData[], columnsPerRow: number = 1): InputRichBlockButtons[] {
  return chunk(buttons, columnsPerRow).map((row) => ({
    type: 'buttons',
    align: 'center',
    buttons: row.map<RichMessageButton>((button) => ({
      text: button.text,
      callback_data: button.data,
      ...(button.style ? { style: button.style } : {}),
    })),
  }));
}

export async function sendRichMessageWithButtons(bot: Bot, chatId: number, blocks: InputRichBlock[], form = {}): Promise<Message.RichMessageMessage> {
  return bot.api.sendRichMessage(chatId, { blocks }, form);
}
