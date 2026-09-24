import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { chunk, getErrorMessage, Logger } from '@core/utils';
import { fetchUserEmails, trashEmail } from '@services/gmail';
import { sendShortenedMessage } from '@services/telegram';
import { askJevNoul } from '@services/typesafe';
import { CHATBOT_CONFIG } from '../chatbot.config';

const logger = new Logger('chatbot:scheduler:email-cleanup');

const EMAIL_QUERY = 'in:inbox is:unread newer_than:1d';
const JEV_CONCURRENCY = 5;
const SPAM_QUESTION = {
  instructions: 'Is this email spam or an advertisement?',
  criteria: {
    true: 'Spam, phishing, marketing, promotion, newsletter pushing a sale, or any unsolicited advertisement',
    false: 'A personal, transactional, work, or otherwise legitimate email the recipient would want to read',
  },
};

type CandidateEmail = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly snippet: string;
};

export type TrashedEmail = {
  readonly id: string;
  readonly from: string;
  readonly subject: string;
  readonly probability: number;
};

export function buildEmailState(email: CandidateEmail): string {
  return `From: ${email.from}\nSubject: ${email.subject}\nSnippet: ${email.snippet}`;
}

export function buildJevUnavailableWarning(skipped: number): string {
  return `⚠️ Email cleanup: Jev unavailable (${skipped} email${skipped === 1 ? '' : 's'} skipped). Check TYPESAFE_API_KEY and the logs.`;
}

export function buildCleanupReport(trashed: ReadonlyArray<TrashedEmail>): string {
  const lines = trashed.map((email) => `• ${email.from} — ${email.subject} (${Math.round(email.probability * 100)}%)`);
  return [`🧹 Moved ${trashed.length} spam/ad email${trashed.length === 1 ? '' : 's'} to trash:`, '', ...lines].join('\n');
}

type CleanupOutcome = { readonly status: 'trashed'; readonly email: TrashedEmail } | { readonly status: 'kept' | 'jev_failed' | 'trash_failed' };

async function cleanupEmail(email: CandidateEmail, threshold: number): Promise<CleanupOutcome> {
  let probability: number;
  try {
    probability = await askJevNoul(buildEmailState(email), SPAM_QUESTION);
  } catch (err) {
    logger.error(`Jev failed for email ${email.id}: ${getErrorMessage(err)}`);
    return { status: 'jev_failed' };
  }

  if (probability <= threshold) {
    return { status: 'kept' };
  }

  try {
    await trashEmail(email.id);
    return { status: 'trashed', email: { id: email.id, from: email.from, subject: email.subject, probability } };
  } catch (err) {
    logger.error(`Failed to trash email ${email.id}: ${getErrorMessage(err)}`);
    return { status: 'trash_failed' };
  }
}

export async function emailCleanup(bot: Bot): Promise<void> {
  const { threshold, maxEmails } = CHATBOT_CONFIG.emailCleanup;
  try {
    const emails = (await fetchUserEmails(EMAIL_QUERY, maxEmails)) ?? [];
    if (!emails.length) {
      return;
    }

    const outcomes: CleanupOutcome[] = [];
    for (const batch of chunk(emails, JEV_CONCURRENCY)) {
      outcomes.push(...(await Promise.all(batch.map((email) => cleanupEmail(email, threshold)))));
    }

    const trashed = outcomes.flatMap((outcome) => (outcome.status === 'trashed' ? [outcome.email] : []));
    const jevFailures = outcomes.filter((outcome) => outcome.status === 'jev_failed').length;
    logger.log(`Checked ${emails.length} emails, trashed ${trashed.length}, Jev failures ${jevFailures}`);

    if (jevFailures === emails.length) {
      await sendShortenedMessage(bot, MY_USER_ID, buildJevUnavailableWarning(jevFailures));
      return;
    }
    if (!trashed.length) {
      return;
    }

    await sendShortenedMessage(bot, MY_USER_ID, buildCleanupReport(trashed));
  } catch (err) {
    logger.error(`Failed to run email cleanup: ${getErrorMessage(err)}`);
  }
}
