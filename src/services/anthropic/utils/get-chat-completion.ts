import { ANTHROPIC_DEFAULT_MAX_TOKENS, ANTHROPIC_OPUS_MODEL } from '../constants';
import { provideAnthropicClient } from '../provide-anthropic-client';

export async function getChatCompletion(system: string, content: string) {
  const anthropic = provideAnthropicClient();
  const result = await anthropic.messages.create({
    model: ANTHROPIC_OPUS_MODEL,
    max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content }],
    system,
  });
  return { threadId: result.id, content: result.content };
}
