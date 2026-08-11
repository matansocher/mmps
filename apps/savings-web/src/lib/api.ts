import { ApiError, createJsonRequester } from '@mmps/web-api';
import type { Portfolio, PortfolioResponse, RevisionConflictResponse } from '../types';

export { ApiError };

const request = createJsonRequester({
  credentials: 'include',
  headers: () => ({
    Accept: 'application/json',
  }),
});

export function isRevisionConflictResponse(value: unknown): value is RevisionConflictResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RevisionConflictResponse>;
  return candidate.error === 'revision_conflict' && Boolean(candidate.portfolio);
}

export const savingsApi = {
  getPortfolio: async (): Promise<PortfolioResponse> => request<PortfolioResponse>('/api/savings/portfolio'),
  login: async (password: string): Promise<void> =>
    request<void>('/api/savings/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  logout: async (): Promise<void> =>
    request<void>('/api/savings/auth/logout', {
      method: 'POST',
    }),
  savePortfolio: async (portfolio: Portfolio): Promise<PortfolioResponse> =>
    request<PortfolioResponse>('/api/savings/portfolio', {
      method: 'PUT',
      body: JSON.stringify({
        revision: portfolio.revision,
        settings: portfolio.settings,
        holdings: portfolio.holdings,
      }),
    }),
};
