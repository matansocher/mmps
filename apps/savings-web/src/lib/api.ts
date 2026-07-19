import type { Portfolio, PortfolioResponse, RevisionConflictResponse } from '../types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`request_failed_${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

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
