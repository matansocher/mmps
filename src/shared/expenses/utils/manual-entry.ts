import { ChatOpenAI } from '@langchain/openai';
import { ObjectId } from 'mongodb';
import { env } from 'node:process';
import { z } from 'zod';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { createExpense } from '../mongo';
import type { CreateExpenseData, Expense, ExpenseCategory, ExpenseType } from '../types';

const logger = new Logger('manual-entry');

const CATEGORIES: ReadonlyArray<ExpenseCategory> = ['food', 'groceries', 'transport', 'subscriptions', 'utilities', 'shopping', 'entertainment', 'health', 'bills', 'other'];
const TYPES: ReadonlyArray<ExpenseType> = ['receipt', 'card_alert', 'bill'];

const categorizationSchema = z.object({
  category: z.enum(CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]]).describe('The most fitting category for this expense'),
  type: z
    .enum(TYPES as unknown as [ExpenseType, ...ExpenseType[]])
    .describe(
      'Expense type: "receipt" for one-off purchases (restaurants, shops, groceries), "bill" for recurring services (electricity, water, internet, rent, insurance), "card_alert" only when explicitly a card alert.',
    ),
  vendor: z.string().describe('Cleaned/canonical vendor name (e.g., "wolt" -> "Wolt", "supersal" -> "Shufersal" when obvious typo; otherwise preserve casing)'),
});

const SYSTEM_PROMPT = `You normalize a manually entered expense. Given a vendor name and an ILS amount, classify it.
- Categories: food (restaurants/cafes/delivery), groceries (supermarket), transport (taxi/gas/parking/public transit), subscriptions (Netflix/Spotify/cloud), utilities (electric/water/internet/cellular), shopping (clothes/gadgets/home), entertainment (movies/concerts/games), health (pharmacy/doctor), bills (insurance/tax/rent), other.
- Types: "receipt" for one-off purchases, "bill" for recurring service charges (utilities, insurance, rent, taxes), "card_alert" only when clearly a card alert.
- Clean obvious vendor typos when confident; otherwise preserve input casing.
Return ONLY the structured output.`;

export type ManualExpenseInput = {
  readonly vendor: string;
  readonly amount: number;
};

async function categorize(input: ManualExpenseInput): Promise<z.infer<typeof categorizationSchema>> {
  const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY }).withStructuredOutput(categorizationSchema, {
    name: 'categorize_expense',
  });
  const userPrompt = `Vendor: ${input.vendor}\nAmount: ${input.amount} ILS`;
  return (await model.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ])) as z.infer<typeof categorizationSchema>;
}

export async function createManualExpense(input: ManualExpenseInput): Promise<Expense> {
  if (!input.vendor || !input.vendor.trim()) throw new Error('vendor required');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('amount must be a positive number');

  let llm: z.infer<typeof categorizationSchema>;
  try {
    llm = await categorize(input);
  } catch (err) {
    logger.warn(`Categorize failed, defaulting to "other"/"receipt": ${err}`);
    llm = { category: 'other', type: 'receipt', vendor: input.vendor.trim() };
  }

  const now = new Date();
  const messageId = `manual:${new ObjectId().toString()}`;

  const data: CreateExpenseData = {
    messageId,
    type: llm.type,
    vendor: llm.vendor || input.vendor.trim(),
    category: llm.category,
    amount: Math.round(input.amount * 100) / 100,
    currency: 'ILS',
    emailDate: now,
    transactionDate: now,
    rawSubject: 'manual entry',
    rawFrom: 'manual',
    source: 'manual',
  };

  const insert = await createExpense(data);
  return { ...data, _id: insert.insertedId, createdAt: now } as Expense;
}
