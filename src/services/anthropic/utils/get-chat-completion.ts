import { ANTHROPIC_DEFAULT_MAX_TOKENS, ANTHROPIC_MODEL } from '@services/anthropic/constants';

export async function getChatCompletion(system: string, content: string): Promise<{ threadId: string; content: string }> {
  const result = await this.anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content }],
    system,
  });
  return { threadId: result.id, content: result.content };
}
