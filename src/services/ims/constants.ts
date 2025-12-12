export const IMS_BASE_URL = 'https://ims.gov.il';

export const IMS_ENDPOINTS = {
  currentAnalysis: (lang: string, locationId: number) => `/${lang}/now_analysis/${locationId}`,
  forecast: (lang: string, locationId: number) => `/${lang}/full_forecast_data/${locationId}`,
} as const;

export const DEFAULT_LANGUAGE = 'en' as const;
