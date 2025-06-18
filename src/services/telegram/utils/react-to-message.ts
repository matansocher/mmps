import axios from 'axios';

export async function reactToMessage(botToken: string, chatId: number, messageId: number, emoji: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/setMessageReaction`;
  const payload = { chat_id: chatId, message_id: messageId, reaction: [{ type: 'emoji', emoji }] };

  await axios.post(url, payload).catch((err) => {
    console.error(`failed to react to message: ${err}`);
  });
}
