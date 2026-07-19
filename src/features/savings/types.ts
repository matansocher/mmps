export type SavingsAccount = 'managed' | 'manual';
export type SavingsCurrencyExposure = 'fx' | 'ils';
export type SavingsAssetType = 'equity' | 'solid';
export type SavingsOwner = 'guy' | 'tody' | 'shared';

export type SavingsHolding = {
  readonly id: string;
  readonly account: SavingsAccount;
  readonly name: string;
  readonly category: string;
  readonly geography: string;
  readonly currentAmountIls: number;
  readonly targetAmountIls: number;
  readonly currencyExposure: SavingsCurrencyExposure;
  readonly assetType: SavingsAssetType;
  readonly owner: SavingsOwner;
  readonly note: string;
};

export type SavingsSettings = {
  readonly depositAmountIls: number;
  readonly fxLimitPercent: number;
  readonly solidTargetPercent: number;
  readonly geographyTargets: Readonly<Record<string, number>>;
};

export type SavingsPortfolio = {
  readonly revision: number;
  readonly settings: SavingsSettings;
  readonly holdings: ReadonlyArray<SavingsHolding>;
  readonly updatedAt: Date | null;
};

export type SavingsPortfolioDocument = Omit<SavingsPortfolio, 'updatedAt'> & {
  readonly _id: string;
  readonly updatedAt: Date;
};

export type SaveSavingsPortfolioData = Pick<SavingsPortfolio, 'revision' | 'settings' | 'holdings'>;

export type SaveSavingsPortfolioResult =
  | {
      readonly status: 'saved';
      readonly portfolio: SavingsPortfolioDocument;
    }
  | {
      readonly status: 'conflict';
      readonly portfolio: SavingsPortfolioDocument | null;
    };
