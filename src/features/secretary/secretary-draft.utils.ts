import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { z } from 'zod';
import { GPT_5_MODEL } from '@services/openai/constants';
import { recordModelUsage, UsageCallbackHandler } from '@shared/ai';
import type { SecretaryMessage } from './mongo';
import { DRAFT_GENERATION_PROMPT, DRAFT_OPTIONS_COUNT, OWNER_NAME } from './secretary.config';

export type DraftReply = {
  readonly drafts: string[]; // distinct ready-to-send reply options, best-guess first
  readonly summary: string;
  readonly replyNeeded: number; // 0–1 probability that the owner actually needs to reply
};

const draftSchema = z.object({
  drafts: z
    .array(z.string().describe('A ready-to-send reply option, in her language'))
    .min(1)
    .max(6)
    .describe(`Exactly ${DRAFT_OPTIONS_COUNT} DISTINCT reply options for the owner to choose from, best-guess first. Each option must be meaningfully different in angle/tone, not a reworded duplicate.`),
  summary: z.string().describe('A one-line summary of what she talked about'),
  replyNeeded: z.number().min(0).max(1).describe('Probability (0 to 1) that the owner actually needs to reply: low for acknowledgements/closings, high for questions/requests/plans'),
});

// Trailing messages from her since the owner's last reply.
export function unansweredTail(messages: SecretaryMessage[]): SecretaryMessage[] {
  const tail: SecretaryMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].fromOwner) break;
    tail.unshift(messages[i]);
  }
  return tail;
}

// Assemble the user prompt fed to the draft model from the recent conversation.
export function buildDraftUserPrompt(context: SecretaryMessage[]): { userPrompt: string; wantSummary: boolean } {
  const other = context.find((m) => !m.fromOwner);
  const otherName = other?.senderName || other?.senderUsername || 'her';
  const transcript = context.map((m) => `${m.fromOwner ? OWNER_NAME : otherName}: ${m.text}`).join('\n');
  const userPrompt = `Recent conversation (most recent last):\n\n${transcript}\n\nWrite ${DRAFT_OPTIONS_COUNT} distinct reply options ${OWNER_NAME} could send to her latest unanswered messages. Always include a one-line "summary" of what she talked about.`;
  return { userPrompt, wantSummary: true };
}

const buildModel = () => {
  const model = env.SECRETARY_DRAFT_MODEL || GPT_5_MODEL;
  const temperature = model.startsWith('gpt-5') ? 1 : 0.3;
  return new ChatOpenAI({ model, temperature, apiKey: env.OPENAI_API_KEY });
};

// Generate distinct reply options for the given recent conversation in a single call. Returns null if none produced.
export async function generateDraftReply(context: SecretaryMessage[]): Promise<DraftReply | null> {
  const { userPrompt, wantSummary } = buildDraftUserPrompt(context);

  const structured = buildModel().withStructuredOutput(draftSchema, { name: 'smart_reply_draft' });
  const usageHandler = new UsageCallbackHandler();
  const startedAt = Date.now();
  const result = await structured.invoke([new SystemMessage(DRAFT_GENERATION_PROMPT), new HumanMessage(userPrompt)], { callbacks: [usageHandler] });
  recordModelUsage({ source: 'secretary', chatId: context[0]?.chatId, handler: usageHandler, durationMs: Date.now() - startedAt });

  const drafts = [...new Set((result.drafts ?? []).map((d) => (d ?? '').trim()).filter(Boolean))].slice(0, DRAFT_OPTIONS_COUNT);
  if (drafts.length === 0) return null;
  const summary = wantSummary ? (result.summary ?? '').trim() : '';
  const replyNeeded = typeof result.replyNeeded === 'number' ? result.replyNeeded : 1;
  return { drafts, summary, replyNeeded };
}
