import type { Bot } from 'grammy';
import type { ObjectId } from 'mongodb';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { sendRichMessage } from '@services/telegram';
import { deletePendingRumours, getPendingRumours } from '@shared/transfer-tracker';
import type { PendingRumour } from '@shared/transfer-tracker';

const logger = new Logger('chatbot:scheduler:transfer-digest');

const MAX_ROWS = 50; // rich messages allow up to 500 blocks; cap rows so the table stays readable

// Sends one native rich-text table digest of every transfer rumour collected since the last
// digest, then deletes exactly the rumours that were sent (later arrivals roll into the next day).
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
  const rumours = [...latestByRumour.values()].sort(byInterest);

  const message = buildMessage(rumours);
  try {
    await sendRichMessage(bot, MY_USER_ID, message);
    await deletePendingRumours(pending.map((rumour) => rumour._id).filter(Boolean) as ObjectId[]);
  } catch (err) {
    logger.error(`Failed to send transfer digest, keeping rumours for next digest: ${getErrorMessage(err)}`);
  }
}

// Most interesting first: higher probability, then bigger money.
function byInterest(a: PendingRumour, b: PendingRumour): number {
  return b.probability - a.probability || (b.marketValueEur ?? 0) - (a.marketValueEur ?? 0);
}

// Builds a rich-text Markdown pipe table, rendered natively by Telegram's rich message editor.
function buildMessage(rumours: PendingRumour[]): string {
  const shown = rumours.slice(0, MAX_ROWS);
  const header = row('Player', 'Move', 'Status', 'Prob', 'Value');
  const divider = '|:--|:--|:--|--:|--:|';
  const lines = shown.map((rumour) => row(playerCell(rumour), moveCell(rumour), rumour.status, `${rumour.probability}%`, valueCell(rumour)));
  const table = [header, divider, ...lines].join('\n');

  const omitted = rumours.length - shown.length;
  const omittedNote = omitted > 0 ? `\n\n_…and ${omitted} more_` : '';
  return `**Transfer news** ⚽️ (${rumours.length})\n\n${table}${omittedNote}`;
}

function row(player: string, move: string, status: string, prob: string, value: string): string {
  return `| ${cell(player)} | ${cell(move)} | ${cell(status)} | ${cell(prob)} | ${cell(value)} |`;
}

function playerCell(rumour: PendingRumour): string {
  const name = rumour.playerName ?? 'Unknown';
  return rumour.sourceUrl ? `[${name}](${rumour.sourceUrl})` : name;
}

function moveCell(rumour: PendingRumour): string {
  const from = rumour.fromClub ?? '?';
  const to = rumour.toClub ?? '?';
  return `${from} → ${to}`;
}

// Prefers the estimated fee, then the market value in millions, else a dash.
function valueCell(rumour: PendingRumour): string {
  if (rumour.feeLabel) {
    return rumour.feeLabel;
  }
  if (rumour.marketValueEur) {
    return `€${Math.round(rumour.marketValueEur / 1_000_000)}M`;
  }
  return '-';
}

// Table cells only allow inline content, so collapse whitespace and escape pipes.
function cell(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/\|/g, '\\|').trim();
}
