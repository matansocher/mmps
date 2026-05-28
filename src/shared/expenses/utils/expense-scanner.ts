import { parseISO } from 'date-fns';
import { Logger } from '@core/utils';
import { listMessageIds } from '@services/gmail';
import { DEFAULT_GMAIL_QUERY, DEFAULT_SCAN_MAX_RESULTS } from '../constants';
import { createExpense, getProcessedMessageIds, markEmailProcessed } from '../mongo';
import type { CreateExpenseData, ExpenseCategory, ExpenseType } from '../types';
import { fetchEmailContent } from './email-fetcher';
import { extractExpenseFromEmail, type ExtractionResult } from './extractor';

const logger = new Logger('expense-scanner');

export type ScanOptions = {
  readonly query?: string;
  readonly maxResults?: number;
};

export type ScanResult = {
  readonly scanned: number;
  readonly skipped: number;
  readonly extracted: number;
  readonly notExpense: number;
  readonly errors: number;
  readonly expenseIds: ReadonlyArray<string>;
};

function safeParseDate(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  try {
    const d = parseISO(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d;
  } catch {
    return fallback;
  }
}

function toCreateData(messageId: string, emailDate: Date, fromAddr: string, subject: string, result: ExtractionResult): CreateExpenseData {
  return {
    messageId,
    type: (result.type || 'receipt') as ExpenseType,
    vendor: result.vendor || 'Unknown',
    category: (result.category || 'other') as ExpenseCategory,
    amount: result.amount || 0,
    currency: result.currency || 'ILS',
    emailDate,
    transactionDate: safeParseDate(result.transactionDateIso, emailDate),
    items: result.items?.filter((i): i is { name: string; qty: number; price: number } => !!i.name && typeof i.qty === 'number' && typeof i.price === 'number') || undefined,
    notes: result.notes || undefined,
    rawSubject: subject,
    rawFrom: fromAddr,
    source: (result.source || (result.items ? 'pdf' : 'body')) as 'body' | 'pdf',
  };
}

export async function scanRecentExpenses(opts: ScanOptions = {}): Promise<ScanResult> {
  const query = opts.query || DEFAULT_GMAIL_QUERY;
  const maxResults = opts.maxResults || DEFAULT_SCAN_MAX_RESULTS;

  const messageIds = await listMessageIds(query, maxResults);
  if (messageIds.length === 0) {
    return { scanned: 0, skipped: 0, extracted: 0, notExpense: 0, errors: 0, expenseIds: [] };
  }

  const alreadyProcessed = await getProcessedMessageIds(messageIds);
  const fresh = messageIds.filter((id) => !alreadyProcessed.has(id));
  const skipped = messageIds.length - fresh.length;

  let extracted = 0;
  let notExpense = 0;
  let errors = 0;
  const expenseIds: string[] = [];

  for (const messageId of fresh) {
    try {
      const email = await fetchEmailContent(messageId);
      if (!email) {
        await markEmailProcessed(messageId, 'error', 'fetch returned null');
        errors += 1;
        continue;
      }

      const result = await extractExpenseFromEmail(email);
      if (!result.isExpense || !result.amount || result.amount <= 0) {
        await markEmailProcessed(messageId, 'not_expense');
        notExpense += 1;
        continue;
      }

      const emailDate = safeParseDate(email.date, new Date());
      const createData = toCreateData(messageId, emailDate, email.from, email.subject, result);
      const insert = await createExpense(createData);
      await markEmailProcessed(messageId, 'extracted');
      extracted += 1;
      expenseIds.push(insert.insertedId.toString());
      logger.log(`Extracted expense: ${createData.vendor} ${createData.currency} ${createData.amount}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Scan failed for ${messageId}: ${msg}`);
      try {
        await markEmailProcessed(messageId, 'error', msg);
      } catch {
        // ignore
      }
      errors += 1;
    }
  }

  return { scanned: messageIds.length, skipped, extracted, notExpense, errors, expenseIds };
}
