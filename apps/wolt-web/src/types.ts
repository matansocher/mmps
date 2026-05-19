export type RestaurantItem = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly area: string;
  readonly photo: string;
  readonly link: string;
  readonly isOnline: boolean;
  readonly tags?: ReadonlyArray<string>;
  readonly priceRange?: number;
  readonly rating?: number;
  readonly estimateMinutes?: number;
  readonly shortDescription?: string;
};

export type RestaurantsListResponse = {
  readonly restaurants: ReadonlyArray<RestaurantItem>;
};

export type SubscriptionItem = {
  readonly restaurant: string;
  readonly photo: string;
  readonly createdAt: string;
};

export type SubscriptionsListResponse = {
  readonly subscriptions: ReadonlyArray<SubscriptionItem>;
  readonly max: number;
};

export type SubscribeResponse =
  | { readonly status: 'subscribed'; readonly restaurant: string }
  | { readonly status: 'already_subscribed'; readonly restaurant: string }
  | { readonly status: 'already_open'; readonly restaurant: string; readonly link: string }
  | { readonly status: 'limit_reached'; readonly max: number }
  | { readonly status: 'not_found' };

export type UnsubscribeResponse = {
  readonly status: 'unsubscribed' | 'not_found';
};

export type PreferencesResponse = {
  readonly city: string | null;
};

