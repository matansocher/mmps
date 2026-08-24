import type { Bot } from 'grammy';
import { MY_USER_ID } from '@core/config';
import { getErrorMessage, Logger } from '@core/utils';
import { MODEL_PRICING } from '@shared/ai';
import type { ModelPrice } from '@shared/ai';

const logger = new Logger('chatbot:scheduler:model-pricing-check');

// OpenAI publishes a markdown twin of every docs page, so pricing can be diffed without scraping HTML.
const PRICING_DOC_URL = 'https://developers.openai.com/api/docs/pricing.md';
const STANDARD_TABLE_HEADING = '### Standard pricing data';

// Column layout of the standard pricing table: | Model | input | cached input | cache writes | output | ...
const MODEL_COLUMN = 1;
const INPUT_COLUMN = 2;
const CACHED_INPUT_COLUMN = 3;
const OUTPUT_COLUMN = 5;

export type PricingDrift = {
  readonly model: string;
  readonly local: ModelPrice;
  readonly live: ModelPrice | null; // null when the model is no longer listed in the docs
};

// Reads the "Standard pricing data" table out of the docs markdown. Only that table matters — the
// batch/flex/fast tables below it list the same models at discounted rates we don't bill against.
export function parseStandardPricing(markdown: string): Record<string, ModelPrice> {
  const start = markdown.indexOf(STANDARD_TABLE_HEADING);
  if (start === -1) {
    throw new Error(`Could not find "${STANDARD_TABLE_HEADING}" in the pricing docs`);
  }

  const nextHeading = markdown.indexOf('###', start + STANDARD_TABLE_HEADING.length);
  const table = nextHeading === -1 ? markdown.slice(start) : markdown.slice(start, nextHeading);

  const prices: Record<string, ModelPrice> = {};
  for (const line of table.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (cells.length <= OUTPUT_COLUMN) {
      continue;
    }

    // Strips qualifiers like "gpt-5.5 (<272K context length)" down to the model id.
    const model = cells[MODEL_COLUMN].replace(/\s*\(.*\)$/, '');
    const input = parsePrice(cells[INPUT_COLUMN]);
    const output = parsePrice(cells[OUTPUT_COLUMN]);
    if (!model || input === null || output === null) {
      continue;
    }

    const cachedInput = parsePrice(cells[CACHED_INPUT_COLUMN]);
    prices[model] = { input, output, ...(cachedInput !== null ? { cachedInput } : {}) };
  }

  if (!Object.keys(prices).length) {
    throw new Error('Parsed the pricing table but found no model rows — the docs format likely changed');
  }

  return prices;
}

export function diffPricing(local: Record<string, ModelPrice>, live: Record<string, ModelPrice>): PricingDrift[] {
  const drifts: PricingDrift[] = [];
  for (const [model, price] of Object.entries(local)) {
    const livePrice = live[model];
    if (!livePrice) {
      drifts.push({ model, local: price, live: null });
      continue;
    }
    // A locally-unset cachedInput is not drift — only compare it when we actually track it.
    const cachedDrifted = price.cachedInput !== undefined && livePrice.cachedInput !== undefined && price.cachedInput !== livePrice.cachedInput;
    if (livePrice.input !== price.input || livePrice.output !== price.output || cachedDrifted) {
      drifts.push({ model, local: price, live: livePrice });
    }
  }
  return drifts;
}

export function buildDriftMessage(drifts: PricingDrift[]): string | null {
  if (!drifts.length) {
    return null;
  }

  const lines = drifts.map(({ model, local, live }) => {
    if (!live) {
      return `• *${model}* is no longer listed in the docs — check whether it was renamed or retired.`;
    }
    const rows = [`    in: ${formatPrice(local.input)} → ${formatPrice(live.input)}`, `    out: ${formatPrice(local.output)} → ${formatPrice(live.output)}`];
    if (local.cachedInput !== undefined && live.cachedInput !== undefined && local.cachedInput !== live.cachedInput) {
      rows.push(`    cached in: ${formatPrice(local.cachedInput)} → ${formatPrice(live.cachedInput)}`);
    }
    return [`• *${model}*`, ...rows].join('\n');
  });

  return [`💰 OpenAI pricing drift detected in \`MODEL_PRICING\` (${drifts.length} model${drifts.length > 1 ? 's' : ''}):`, '', ...lines, '', `Source: ${PRICING_DOC_URL}`].join('\n');
}

// Monthly check that the hard-coded MODEL_PRICING table still matches OpenAI's published prices.
// Stays silent when everything matches, so a message always means something needs updating.
export async function modelPricingCheck(bot: Bot): Promise<void> {
  try {
    const response = await fetch(PRICING_DOC_URL);
    if (!response.ok) {
      throw new Error(`Pricing docs request failed with status ${response.status}`);
    }

    const drifts = diffPricing(MODEL_PRICING, parseStandardPricing(await response.text()));
    const message = buildDriftMessage(drifts);
    if (!message) {
      logger.log(`Model pricing is up to date (${Object.keys(MODEL_PRICING).length} models checked)`);
      return;
    }

    logger.warn(`Model pricing drift detected for: ${drifts.map((drift) => drift.model).join(', ')}`);
    await bot.api.sendMessage(MY_USER_ID, message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error(`Failed to verify model pricing: ${getErrorMessage(err)}`);
    await bot.api.sendMessage(MY_USER_ID, '⚠️ Failed to verify OpenAI model pricing. Worth a manual look at `MODEL_PRICING`.').catch(() => {});
  }
}

function parsePrice(cell: string): number | null {
  if (!cell.startsWith('$')) {
    return null;
  }
  const value = Number(cell.slice(1).replace(/,/g, ''));
  return Number.isNaN(value) ? null : value;
}

function formatPrice(value: number): string {
  return `$${value}`;
}
