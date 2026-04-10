import { tool } from '@langchain/core/tools';
import { Api } from 'grammy';
import { env } from 'node:process';
import { z } from 'zod';

const CHILLI_GROUP_CHAT_ID = -5292792141;

const schema = z.object({
  message: z.string().describe('The message to send as Chilli in the group chat. Should be written in Hebrew, in character as Chilli the cat.'),
});

async function runner({ message }: z.infer<typeof schema>) {
  try {
    const api = new Api(env.CHILLI_TELEGRAM_BOT_TOKEN);
    await api.sendMessage(CHILLI_GROUP_CHAT_ID, message);
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
