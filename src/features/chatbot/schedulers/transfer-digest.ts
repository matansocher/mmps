import type { Bot } from 'grammy';
import type { ObjectId } from 'mongodb';
import { z } from 'zod';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { getResponse } from '@services/openai';
import { GPT_SMALL_MODEL } from '@services/openai/constants';
import { sendShortenedMessage } from '@services/telegram';
import { deletePendingRumours, getPendingRumours } from '@shared/transfer-tracker';
import type { PendingRumour } from '@shared/transfer-tracker';

const logger = new Logger('chatbot:scheduler:transfer-digest');

const summarySchema = z.object({
  lines: z.array(z.string()).describe('One short line per transfer, in the same order as the input, describing the move plainly'),
});

// Sends one AI-summarized digest of every transfer rumour collected since the last digest,
// then deletes exactly the rumours that were sent (later arrivals roll into the next day).
export async function transferDigest(bot: Bot): Promise<void> {
  const pending = await getPendingRumours();
  if (!pending.length) {
    return;
  }

  // A rumour can be collected several times as it develops; keep only the latest snapshot per rumour for display.
  const latestByRumour = new Map<string, PendingRumour>();
  for (const rumour of pending) {
    latestByRumour.set(rumour.rumourId, rumour);
  }
  const rumours = [...latestByRumour.values()];

  let body: string;
  try {
    body = await buildSummaryBody(rumours);
  } catch (err) {
    logger.error(`Failed to summarize transfer digest, falling back to raw listing: ${getErrorMessage(err)}`);
    body = rumours.map(rawLine).join('\n');
  }

  const message = `*Transfer news* ⚽️\n\n${body}`;
  try {
    await sendShortenedMessage(bot, MY_USER_ID, message, { parse_mode: 'Markdown' }).catch(() => sendShortenedMessage(bot, MY_USER_ID, message.replace(/[*_`[\]]/g, '')));
    await deletePendingRumours(pending.map((rumour) => rumour._id).filter(Boolean) as ObjectId[]);
  } catch (err) {
    logger.error(`Failed to send transfer digest, keeping rumours for next digest: ${getErrorMessage(err)}`);
  }
}

async function buildSummaryBody(rumours: PendingRumour[]): Promise<string> {
  const instructions = [
    `You write a daily football transfer digest.`,
    `You will receive ${rumours.length} transfer rumours. Return exactly ${rumours.length} lines, in the same order.`,
    `Each line is one short, factual sentence: who is moving, from which club to which club, the deal stage, and the fee if given.`,
    `Do not invent details or add opinions. Keep it concise and scannable.`,
  ].join('\n');
  const input = rumours.map((rumour, i) => `Rumour ${i + 1}:\n${describe(rumour)}`).join('\n\n');

  const { result } = await getResponse({ instructions, input, schema: summarySchema, model: GPT_SMALL_MODEL, store: false });
  if (result.lines.length !== rumours.length) {
    throw new Error(`expected ${rumours.length} lines, got ${result.lines.length}`);
  }
  return result.lines.map((line, i) => decorate(rumours[i], line)).join('\n');
}

// Compact facts fed to the model for one rumour.
function describe(rumour: PendingRumour): string {
  const parts = [
    rumour.playerName ?? 'Unknown player',
    rumour.playerPosition ? `(${rumour.playerPosition})` : null,
    rumour.fromClub ? `from ${rumour.fromClub}` : null,
    rumour.toClub ? `to ${rumour.toClub}` : null,
    `status: ${rumour.status} (${rumour.probability}%)`,
    rumour.feeLabel ? `fee: ${rumour.feeLabel}` : null,
    rumour.sourceName ? `source: ${rumour.sourceName}` : null,
    rumour.summary ? `summary: ${rumour.summary}` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}

// Prefixes a status emoji and appends the source link so lines are scannable and clickable.
function decorate(rumour: PendingRumour, line: string): string {
  const emoji = statusEmoji(rumour.status);
  const link = rumour.sourceUrl ? ` [source](${rumour.sourceUrl})` : '';
  return `${emoji} ${line}${link}`;
}

function rawLine(rumour: PendingRumour): string {
  const text = rumour.summary ?? `${rumour.playerName ?? 'Unknown'} to ${rumour.toClub ?? '?'}`;
  const link = rumour.sourceUrl ? ` [source](${rumour.sourceUrl})` : '';
  return `${statusEmoji(rumour.status)} ${text} (${rumour.probability}%)${link}`;
}

function statusEmoji(status: string): string {
  switch (status) {
    case 'confirmed':
    case 'agreed':
      return '🟢';
    case 'imminent':
      return '🟡';
    case 'collapsed':
      return '🔴';
    default:
      return '⚪️';
  }
}
