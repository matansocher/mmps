import { ChatOpenAI } from '@langchain/openai';
import { ObjectId } from 'mongodb';
import { env } from 'node:process';
import { z } from 'zod';
import { Logger } from '@core/utils';
import { CHAT_COMPLETIONS_MINI_MODEL } from '@services/openai/constants';
import { createExpense } from '../mongo';
import { DEFAULT_CURRENCY, EXPENSE_CATEGORIES, type Currency, type ExpenseCategory } from '../types';
import type { CreateExpenseData, Expense, ExpenseType } from '../types';

const logger = new Logger('manual-entry');

const TYPES: ReadonlyArray<ExpenseType> = ['receipt', 'card_alert', 'bill'];

const categorizationSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES as unknown as [ExpenseCategory, ...ExpenseCategory[]]).describe('The most fitting category for this expense'),
  type: z
    .enum(TYPES as unknown as [ExpenseType, ...ExpenseType[]])
    .describe(
      'Expense type: "receipt" for one-off purchases (restaurants, shops, groceries), "bill" for recurring services (electricity, water, internet, rent, insurance), "card_alert" only when explicitly a card alert.',
    ),
  vendor: z.string().describe('Cleaned/canonical vendor name (e.g., "wolt" -> "Wolt", "supersal" -> "Shufersal" when obvious typo; otherwise preserve casing)'),
});

const SYSTEM_PROMPT = `You normalize a manually entered expense. Given a vendor name and an ILS amount, classify it.
- Categories:
  • restaurants — sit-down restaurants, cafes, bars, delivery (Wolt, Glovo)
  • fast_food — quick-service / takeaway food chains
  • groceries — supermarkets, butchers, produce, beverages, mini-markets
  • fuel — gas stations
  • transport — taxis, public transit, parking, tolls, vehicle services
  • home — furniture, hardware, household goods, pet stores
  • shopping — clothing, electronics, general retail
  • health — pharmacies, doctors, clinics, dental
  • entertainment — movies, gaming, leisure activities
  • events — ticketed events, nightlife
  • travel — hotels, accommodation, flights
  • communications — internet, mobile, cable, computers/phones
  • insurance — life, health, car, home insurance
  • government — tolls, taxes, fines, government fees
  • subscriptions — Netflix, Spotify, cloud services
  • utilities — electric, water, gas
  • bills — rent, recurring miscellaneous
  • transfer — money transfers, bank transfers, payments to individuals
  • electronics — electronics, computers, phones, hardware
  • books — books, bookstores, printed media
  • other — anything that doesn't fit
- Types: "receipt" for one-off purchases, "bill" for recurring service charges (utilities, insurance, rent, taxes), "card_alert" only when clearly a card alert.
- Clean obvious vendor typos when confident; otherwise preserve input casing.
Return ONLY the structured output.`;

export type ManualExpenseInput = {
  readonly vendor: string;
  readonly amount: number;
  readonly currency?: Currency;
  readonly transactionDate?: Date;
  readonly category?: ExpenseCategory;
  readonly card?: string;
};

async function categorize(input: ManualExpenseInput): Promise<z.infer<typeof categorizationSchema>> {
  const model = new ChatOpenAI({ model: CHAT_COMPLETIONS_MINI_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY }).withStructuredOutput(categorizationSchema, {
    name: 'categorize_expense',
  });
  const userPrompt = `Vendor: ${input.vendor}\nAmount: ${input.amount} ${input.currency ?? DEFAULT_CURRENCY}`;
  return (await model.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ])) as z.infer<typeof categorizationSchema>;
}

// Reusable categorizer for callers (e.g. the XLSX importer) that need the AI's
// {category, type} guess for an unknown vendor without inserting anything.
export async function categorizeVendor(input: {
  readonly vendor: string;
  readonly amount: number;
  readonly currency?: Currency;
}): Promise<{ readonly category: ExpenseCategory; readonly type: ExpenseType }> {
  try {
    const llm = await categorize(input);
    return { category: llm.category, type: llm.type };
  } catch (err) {
    logger.warn(`categorizeVendor failed for "${input.vendor}", defaulting to other/card_alert: ${err}`);
    return { category: 'other', type: 'card_alert' };
  }
}

export async function createManualExpense(input: ManualExpenseInput): Promise<Expense> {
  if (!input.vendor || !input.vendor.trim()) throw new Error('vendor required');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('amount must be a positive number');

  let llm: z.infer<typeof categorizationSchema>;
  if (input.category) {
    // User picked a category; skip the LLM call.
    llm = { category: input.category, type: 'receipt', vendor: input.vendor.trim() };
  } else {
    try {
      llm = await categorize(input);
    } catch (err) {
      logger.warn(`Categorize failed, defaulting to "other"/"receipt": ${err}`);
      llm = { category: 'other', type: 'receipt', vendor: input.vendor.trim() };
    }
  }

  const now = new Date();
  const messageId = `manual:${new ObjectId().toString()}`;

  const data: CreateExpenseData = {
    messageId,
    type: llm.type,
    vendor: llm.vendor || input.vendor.trim(),
    category: llm.category,
    amount: Math.round(input.amount * 100) / 100,
    currency: input.currency ?? DEFAULT_CURRENCY,
    transactionDate: input.transactionDate ?? now,
    ...(input.card ? { card: input.card } : {}),
  };

  const insert = await createExpense(data);
  return { ...data, _id: insert.insertedId, createdAt: now } as Expense;
}
