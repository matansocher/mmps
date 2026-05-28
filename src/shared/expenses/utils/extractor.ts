import { ChatOpenAI } from '@langchain/openai';
import { env } from 'node:process';
import { z } from 'zod';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { bumpSenderTemplate, getSenderTemplate, setSenderTemplateHint } from '../mongo';
import type { FetchedEmailContent } from './email-fetcher';

const logger = new Logger('expense-extractor');

const HINT_REFRESH_EVERY = 5;

const itemSchema = z.object({
  name: z.string().describe('Item name'),
  qty: z.number().describe('Quantity'),
  price: z.number().describe('Total price of the line item in the email currency'),
});

const extractionSchema = z.object({
  isExpense: z
    .boolean()
    .describe(
      'True if this email represents a real money transaction (receipt, card charge alert, bill, invoice). False for marketing, newsletters, shipping notifications without charge, refunds, or anything that is not an actual expense.',
    ),
  type: z
    .enum(['receipt', 'card_alert', 'bill'])
    .nullable()
    .describe('Receipt = order/purchase receipt; card_alert = bank/credit-card transaction notification; bill = invoice/utility bill. Null if not an expense.'),
  vendor: z.string().nullable().describe('The merchant or service name (e.g., "Wolt", "Spotify", "Cellcom"). Null if not an expense.'),
  category: z.enum(['food', 'groceries', 'transport', 'subscriptions', 'utilities', 'shopping', 'entertainment', 'health', 'bills', 'other']).nullable(),
  amount: z.number().nullable().describe('Total amount charged. Null if not an expense.'),
  currency: z.string().nullable().describe('ISO currency code: ILS, USD, EUR, GBP, etc. Use ILS for ₪/שח/שקל.'),
  transactionDateIso: z.string().nullable().describe('ISO date string of the transaction. Null if unknown.'),
  source: z.enum(['body', 'pdf']).nullable().describe('Where the data was primarily extracted from.'),
  items: z.array(itemSchema).nullable().describe('Line items if available, otherwise null.'),
  notes: z.string().nullable().describe('Short free-form note for anything notable (e.g., delivery fee, discount applied).'),
});

export type ExtractionResult = z.infer<typeof extractionSchema>;

const SYSTEM_PROMPT = `You are an expense extraction assistant. You receive an email (subject, from, body, and optionally PDF text). Decide whether it represents a real personal money expense, and if so extract structured fields.

Be strict about isExpense:
- TRUE: order receipts, restaurant bills, credit-card charge notifications, utility/cellular/internet bills, subscription invoices, ride-hailing trips with a price.
- FALSE: marketing, shopping cart abandonment, shipping/tracking updates without a charge, newsletters, support emails, refunds, transfers between own accounts, deposits, login alerts, security alerts.

Use the email's currency exactly. Israeli shekel symbol ₪, "ש"ח", "שח", "שקל", "NIS" all map to ISO currency "ILS".
For Wolt food delivery, use category "food". For supermarkets use "groceries".
If you are uncertain about a field, set it to null rather than guessing.
Return ONLY the structured output.`;

function buildModel(): ChatOpenAI {
  return new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY });
}

function buildUserPrompt(email: FetchedEmailContent, hint: string | null): string {
  const pdfBlocks = email.pdfs.map((p, i) => `[PDF ${i + 1}: ${p.filename}]\n${p.text}`).join('\n\n');
  const hintBlock = hint ? `\n[Sender hint from prior emails]\n${hint}\n` : '';
  return [
    `From: ${email.from}`,
    `Subject: ${email.subject}`,
    `Date: ${email.date}`,
    hintBlock,
    '--- Body ---',
    email.bodyText.slice(0, 8000),
    pdfBlocks ? `\n--- PDF Attachments ---\n${pdfBlocks.slice(0, 8000)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function maybeRefreshHint(from: string, successCount: number, email: FetchedEmailContent): Promise<void> {
  if (successCount === 0 || successCount % HINT_REFRESH_EVERY !== 0) return;
  try {
    const model = buildModel();
    const summary = await model.invoke(
      `In one short sentence (max 25 words), describe how to extract expense data from emails from "${from}" (subject: "${email.subject}"). Mention typical structure, where the total appears, and the currency. Be specific and reusable as a hint for future extractions.`,
    );
    const text = typeof summary.content === 'string' ? summary.content : JSON.stringify(summary.content);
    await setSenderTemplateHint(from, text.trim());
  } catch (err) {
    logger.warn(`Failed to refresh sender hint for ${from}: ${err}`);
  }
}

export async function extractExpenseFromEmail(email: FetchedEmailContent): Promise<ExtractionResult> {
  const template = await getSenderTemplate(email.from);
  const model = buildModel().withStructuredOutput(extractionSchema, { name: 'extract_expense' });
  const userPrompt = buildUserPrompt(email, template?.hint || null);
  const result = (await model.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ])) as ExtractionResult;

  if (result.isExpense) {
    await bumpSenderTemplate(email.from);
    const updated = await getSenderTemplate(email.from);
    await maybeRefreshHint(email.from, updated?.successCount || 0, email);
  }

  return result;
}
