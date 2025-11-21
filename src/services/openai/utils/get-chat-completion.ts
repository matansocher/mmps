import { chunk } from '@core/utils';
import { CHAT_COMPLETIONS_MODEL } from '../constants';
import { provideOpenAiClient } from '../provide-openai-client';

export async function getChatCompletion(prompt: string, userText: string = ''): Promise<string> {
  const client = provideOpenAiClient();
  let userMessages;
  if (typeof userText === 'string') {
    userMessages = [userText].filter(Boolean);
  } else {
    // array
    userMessages = chunk(userText, 100);
  }
  const result = await client.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      ...userMessages.map((message) => ({
        role: 'user',
        content: typeof message === 'string' ? message : JSON.stringify(message),
      })),
    ],
    model: CHAT_COMPLETIONS_MODEL,
  });
  return result.choices[0].message.content;
}
