export type EarthFeatureFlags = {
  readonly photorealistic: boolean;
  readonly places: boolean;
};

export type EarthConfigResponse = {
  readonly googleMapsKey: string;
  readonly features: EarthFeatureFlags;
};

export type EarthApiError = {
  readonly error: string;
};
