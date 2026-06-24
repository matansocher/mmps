import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { z } from 'zod';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import type { SecretaryMessage } from './mongo';
import { DRAFT_GENERATION_PROMPT, OWNER_NAME, SUMMARY_CHAR_THRESHOLD } from './secretary.config';

export type DraftReply = {
  readonly draft: string;
  readonly summary: string;
  readonly replyNeeded: number; // 0–1 probability that the owner actually needs to reply
};

const draftSchema = z.object({
  draft: z.string().describe('The ready-to-send reply text, in her language'),
  summary: z.string().describe('A one-line summary of what she talked about, or an empty string if her messages were short'),
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
export function buildDraftUserPrompt(context: SecretaryMessage[], unanswered: SecretaryMessage[]): { userPrompt: string; wantSummary: boolean } {
  const other = context.find((m) => !m.fromOwner);
  const otherName = other?.senderName || other?.senderUsername || 'her';
  const transcript = context.map((m) => `${m.fromOwner ? OWNER_NAME : otherName}: ${m.text}`).join('\n');
  const unansweredText = unanswered.map((m) => m.text).join(' ');
  const wantSummary = unansweredText.length >= SUMMARY_CHAR_THRESHOLD;
  const userPrompt = `Recent conversation (most recent last):\n\n${transcript}\n\nWrite ${OWNER_NAME}'s reply to her latest unanswered messages.${wantSummary ? '' : ' Her messages are short, so leave "summary" empty.'}`;
  return { userPrompt, wantSummary };
}

const buildModel = () => new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0.3, apiKey: env.OPENAI_API_KEY });

// Generate a single draft reply for the given recent conversation. Returns null if no draft was produced.
export async function generateDraftReply(context: SecretaryMessage[]): Promise<DraftReply | null> {
  const unanswered = unansweredTail(context);
  const { userPrompt, wantSummary } = buildDraftUserPrompt(context, unanswered);

  const structured = buildModel().withStructuredOutput(draftSchema, { name: 'smart_reply_draft' });
  const result = await structured.invoke([new SystemMessage(DRAFT_GENERATION_PROMPT), new HumanMessage(userPrompt)]);

  const draft = (result.draft ?? '').trim();
  if (!draft) return null;
  const summary = wantSummary ? (result.summary ?? '').trim() : '';
  const replyNeeded = typeof result.replyNeeded === 'number' ? result.replyNeeded : 1;
  return { draft, summary, replyNeeded };
}
