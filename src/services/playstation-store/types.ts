export type PsStorePrice = {
  readonly basePrice: string; // display string: "ILS 280.00"
  readonly discountedPrice: string;
  readonly basePriceValue: number; // minor units, full RRP
  readonly discountedValue: number; // minor units, the number we track
  readonly currencyCode: string;
  readonly discountText: string | null;
  readonly endsAt: Date | null; // when the current discount expires
  readonly isFree: boolean;
};

export type PsStoreGame = {
  readonly conceptId: string;
  readonly productId?: string; // the exact edition the price was read from, when known
  readonly name: string;
  readonly url: string;
  readonly coverUrl: string | null;
  readonly price: PsStorePrice;
};

export type PsStoreUrlKind = 'concept' | 'product';

export type ParsedPsStoreUrl = {
  readonly kind: PsStoreUrlKind;
  readonly id: string;
};

// Shape of the price objects embedded in the store page's `env:*` script tags.
export type PsStorePriceResponse = {
  readonly basePrice?: string;
  readonly discountedPrice?: string;
  readonly basePriceValue?: number;
  readonly discountedValue?: number;
  readonly currencyCode?: string;
  readonly displayDiscountText?: string | null;
  readonly endTime?: string | number | null; // epoch milliseconds, as a string
  readonly isFree?: boolean;
  readonly serviceBranding?: readonly string[];
};

export type PsStoreCacheEntry = {
  readonly __typename?: string;
  readonly id?: string;
  readonly name?: string;
  readonly [key: string]: unknown;
};

export type PsStoreCache = Record<string, PsStoreCacheEntry>;
