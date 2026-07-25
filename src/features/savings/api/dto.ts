import { SAVINGS_GEOGRAPHY_LABELS } from '../constants';
import type { SavingsHolding, SavingsPortfolio, SavingsPortfolioDocument, SavingsSettings } from '../types';

const MAX_HOLDINGS = 50;
const MAX_NAME_LENGTH = 160;
const MAX_TEXT_LENGTH = 240;
const MAX_NOTE_LENGTH = 500;
const MAX_AMOUNT_ILS = 1_000_000_000_000;

export type SavingsPortfolioDto = {
  readonly revision: number;
  readonly settings: SavingsSettings;
  readonly holdings: ReadonlyArray<SavingsHolding>;
  readonly updatedAt: string | null;
};

export type SavingsPortfolioResponse = {
  readonly portfolio: SavingsPortfolioDto;
};

export type SaveSavingsPortfolioBody = {
  readonly revision: number;
  readonly settings: SavingsSettings;
  readonly holdings: ReadonlyArray<SavingsHolding>;
};

export type SavingsApiError = {
  readonly error: string;
  readonly portfolio?: SavingsPortfolioDto;
};

export const EMPTY_SAVINGS_PORTFOLIO: SavingsPortfolio = {
  revision: 0,
  settings: {
    depositAmountIls: 0,
    fxLimitPercent: 45,
    solidTargetPercent: 20,
    geographyTargets: {},
  },
  holdings: [],
  updatedAt: null,
};

export function toSavingsPortfolioDto(portfolio: SavingsPortfolio | SavingsPortfolioDocument): SavingsPortfolioDto {
  return {
    revision: portfolio.revision,
    settings: {
      ...portfolio.settings,
      geographyTargets: portfolio.settings.geographyTargets ?? {},
    },
    holdings: portfolio.holdings.map((holding) => ({
      ...holding,
      owner: holding.owner ?? 'shared',
    })),
    updatedAt: portfolio.updatedAt?.toISOString() ?? null,
  };
}

function isFiniteNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function parseString(value: unknown, maxLength: number, required = false): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength || (required && trimmed.length === 0)) return null;
  return trimmed;
}

function isGeographyTargets(value: unknown): value is Readonly<Record<string, number>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > SAVINGS_GEOGRAPHY_LABELS.length) return false;
  if (!entries.every(([key, amount]) => (SAVINGS_GEOGRAPHY_LABELS as readonly string[]).includes(key) && isFiniteNumberInRange(amount, 0, 100))) return false;
  if (entries.length === 0) return true;
  const total = entries.reduce((sum, [, amount]) => sum + (amount as number), 0);
  return Math.abs(total - 100) < 0.5;
}

function isSavingsSettings(value: unknown): value is SavingsSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Record<string, unknown>;
  return (
    isFiniteNumberInRange(settings.depositAmountIls, 0, MAX_AMOUNT_ILS) &&
    isFiniteNumberInRange(settings.fxLimitPercent, 0, 100) &&
    isFiniteNumberInRange(settings.solidTargetPercent, 0, 100) &&
    isGeographyTargets(settings.geographyTargets)
  );
}

function isOptionalBreakdown(value: unknown, allowedKeys: readonly string[]): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  if (!entries.every(([key, amount]) => allowedKeys.includes(key) && isFiniteNumberInRange(amount, 0, 100))) return false;
  const total = entries.reduce((sum, [, amount]) => sum + (amount as number), 0);
  return Math.abs(total - 100) < 0.5;
}

function parseOptionalBreakdown(value: unknown, allowedKeys: readonly string[]): Record<string, number> | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isOptionalBreakdown(value, allowedKeys)) return undefined;
  return value as Record<string, number>;
}

function parseSavingsHolding(value: unknown): SavingsHolding | null {
  if (!value || typeof value !== 'object') return null;
  const holding = value as Record<string, unknown>;
  const id = parseString(holding.id, 100, true);
  const name = parseString(holding.name, MAX_NAME_LENGTH);
  const geography = parseString(holding.geography, MAX_TEXT_LENGTH);
  const note = parseString(holding.note, MAX_NOTE_LENGTH);
  if (
    id === null ||
    name === null ||
    geography === null ||
    note === null ||
    (holding.account !== 'managed' && holding.account !== 'manual') ||
    !isFiniteNumberInRange(holding.currentAmountIls, 0, MAX_AMOUNT_ILS) ||
    !isFiniteNumberInRange(holding.targetAmountIls, 0, MAX_AMOUNT_ILS) ||
    (holding.currencyExposure !== 'fx' && holding.currencyExposure !== 'ils') ||
    (holding.assetType !== 'equity' && holding.assetType !== 'solid') ||
    (holding.owner !== 'guy' && holding.owner !== 'tody' && holding.owner !== 'shared') ||
    !isOptionalBreakdown(holding.geographyBreakdown, SAVINGS_GEOGRAPHY_LABELS) ||
    !isOptionalBreakdown(holding.currencyBreakdown, ['fx', 'ils']) ||
    !isOptionalBreakdown(holding.assetBreakdown, ['equity', 'solid'])
  ) {
    return null;
  }

  const result: SavingsHolding = {
    id,
    account: holding.account,
    name,
    geography,
    currentAmountIls: holding.currentAmountIls,
    targetAmountIls: holding.targetAmountIls,
    currencyExposure: holding.currencyExposure,
    assetType: holding.assetType,
    owner: holding.owner,
    note,
  };

  const geographyBreakdown = parseOptionalBreakdown(holding.geographyBreakdown, SAVINGS_GEOGRAPHY_LABELS as readonly string[]);
  const currencyBreakdown = parseOptionalBreakdown(holding.currencyBreakdown, ['fx', 'ils']);
  const assetBreakdown = parseOptionalBreakdown(holding.assetBreakdown, ['equity', 'solid']);

  return {
    ...result,
    ...(geographyBreakdown ? { geographyBreakdown } : {}),
    ...(currencyBreakdown ? { currencyBreakdown } : {}),
    ...(assetBreakdown ? { assetBreakdown } : {}),
  };
}

export function parseSaveSavingsPortfolioBody(value: unknown): SaveSavingsPortfolioBody | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (!Number.isSafeInteger(body.revision) || (body.revision as number) < 0) return null;
  if (!isSavingsSettings(body.settings)) return null;
  if (!Array.isArray(body.holdings) || body.holdings.length > MAX_HOLDINGS) return null;
  const holdings = body.holdings.map(parseSavingsHolding);
  if (holdings.some((holding) => holding === null)) return null;
  const parsedHoldings = holdings as SavingsHolding[];

  const ids = new Set(parsedHoldings.map((holding) => holding.id));
  if (ids.size !== parsedHoldings.length) return null;

  return {
    revision: body.revision as number,
    settings: body.settings,
    holdings: parsedHoldings,
  };
}
