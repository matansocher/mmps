export type HoldingAccount = 'managed' | 'manual';
export type CurrencyExposure = 'fx' | 'ils';
export type AssetType = 'equity' | 'solid';
export type HoldingOwner = 'guy' | 'tody' | 'shared';

export type Holding = {
  readonly id: string;
  readonly account: HoldingAccount;
  readonly name: string;
  readonly category: string;
  readonly geography: string;
  readonly currentAmountIls: number;
  readonly targetAmountIls: number;
  readonly currencyExposure: CurrencyExposure;
  readonly assetType: AssetType;
  readonly owner: HoldingOwner;
  readonly note: string;
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
