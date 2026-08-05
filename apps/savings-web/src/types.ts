export type HoldingAccount = 'managed' | 'manual';
export type CurrencyExposure = 'fx' | 'ils';
export type AssetType = 'equity' | 'solid';
export type HoldingOwner = 'guy' | 'tody' | 'shared';

export const GEOGRAPHY_LABELS = ['ארהב', 'ישראל', 'אירופה', 'אסיה'] as const;
export type HoldingGeography = (typeof GEOGRAPHY_LABELS)[number];

export type BreakdownRecord = Readonly<Record<string, number>>;

export type Holding = {
  readonly id: string;
  readonly account: HoldingAccount;
  readonly name: string;
  readonly geography: string;
  readonly currentAmountIls: number;
  readonly targetAmountIls: number;
  readonly currencyExposure: CurrencyExposure;
  readonly assetType: AssetType;
  readonly owner: HoldingOwner;
  readonly note: string;
  readonly geographyBreakdown?: BreakdownRecord;
  readonly currencyBreakdown?: BreakdownRecord;
  readonly assetBreakdown?: BreakdownRecord;
};

export type HoldingDraft = Omit<Holding, 'id'>;

export type PortfolioSettings = {
  readonly depositAmountIls: number;
  readonly fxLimitPercent: number;
  readonly solidTargetPercent: number;
  readonly geographyTargets: Readonly<Record<string, number>>;
};

export type Portfolio = {
  readonly revision: number;
  readonly settings: PortfolioSettings;
  readonly holdings: readonly Holding[];
  readonly updatedAt: string | null;
};

export type PortfolioResponse = {
  readonly portfolio: Portfolio;
};

export type RevisionConflictResponse = {
  readonly error: 'revision_conflict';
  readonly portfolio: Portfolio;
};

export type SaveStatus = 'clean' | 'saving' | 'saved' | 'error' | 'conflict';
