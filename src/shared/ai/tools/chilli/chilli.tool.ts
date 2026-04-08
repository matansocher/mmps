import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { BOT_CONFIG } from '@features/chilli/chilli.config';
import { provideTelegramBot } from '@services/telegram';

const CHILLI_GROUP_CHAT_ID = -5292792141;

const schema = z.object({
  message: z.string().describe('The message to send as Chilli in the group chat. Should be written in Hebrew, in character as Chilli the cat.'),
});

async function runner({ message }: z.infer<typeof schema>) {
  try {
    const bot = provideTelegramBot(BOT_CONFIG);
    await bot.api.sendMessage(CHILLI_GROUP_CHAT_ID, message);
    return 'Message sent successfully as Chilli.';
  } catch (error) {
    return `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

export const chilliTool = tool(runner, {
  name: 'chilli_message',
  description:
    'Send a message as Chilli the cat bot in the family group chat (Guz, Todi, and Chilli). The message will appear as if Chilli sent it. Write the message in Hebrew, in character as Chilli.',
  schema,
});
