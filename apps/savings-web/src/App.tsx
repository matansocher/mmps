import { useCallback, useEffect, useMemo, useState } from 'react';
import { PortfolioDashboard } from './components/PortfolioDashboard';
import { ErrorScreen, LoadingScreen, LoginScreen } from './components/StateScreens';
import { ApiError, isRevisionConflictResponse, savingsApi } from './lib/api';
import { calculateRebalance } from './lib/rebalance';
import type { Holding, HoldingDraft, Portfolio, PortfolioSettings, SaveStatus } from './types';

type ViewState = 'loading' | 'login' | 'ready' | 'error';

function clonePortfolio(portfolio: Portfolio): Portfolio {
  return {
    ...portfolio,
    settings: { ...portfolio.settings },
    holdings: portfolio.holdings.map((holding) => ({ ...holding })),
  };
}

function comparablePortfolio(portfolio: Portfolio): string {
  return JSON.stringify({ settings: portfolio.settings, holdings: portfolio.holdings });
}

function newHoldingId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `holding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function App() {
  const [view, setView] = useState<ViewState>('loading');
  const [serverPortfolio, setServerPortfolio] = useState<Portfolio | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [latestConflict, setLatestConflict] = useState<Portfolio | null>(null);

  const applyServerPortfolio = useCallback((nextPortfolio: Portfolio): void => {
    const cloned = clonePortfolio(nextPortfolio);
    setServerPortfolio(cloned);
    setPortfolio(clonePortfolio(cloned));
    setLatestConflict(null);
    setStatus('clean');
    setView('ready');
  }, []);

  const loadPortfolio = useCallback(async (): Promise<void> => {
    setView('loading');
    try {
      const response = await savingsApi.getPortfolio();
      applyServerPortfolio(response.portfolio);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setView('login');
        return;
      }
      setView('error');
    }
  }, [applyServerPortfolio]);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  const hasChanges = useMemo(() => {
    if (!portfolio || !serverPortfolio) return false;
    return comparablePortfolio(portfolio) !== comparablePortfolio(serverPortfolio);
  }, [portfolio, serverPortfolio]);

  useEffect(() => {
    if (!hasChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [hasChanges]);

  const result = useMemo(
    () =>
      calculateRebalance(
        portfolio?.holdings ?? [],
        {
          ...(portfolio?.settings ?? { depositAmountIls: 0, fxLimitPercent: 0, solidTargetPercent: 0, geographyTargets: {} }),
          depositAmountIls: 0,
        },
      ),
    [portfolio],
  );

  async function handleLogin(password: string): Promise<void> {
    await savingsApi.login(password);
    const response = await savingsApi.getPortfolio();
    applyServerPortfolio(response.portfolio);
  }

  async function handleLogout(): Promise<void> {
    try {
      await savingsApi.logout();
    } catch {
      // Clear the local authenticated view even if the server session has already expired.
    } finally {
      setServerPortfolio(null);
      setPortfolio(null);
      setView('login');
    }
  }

  function updateHolding(id: string, changes: Partial<Holding>): void {
    setPortfolio((current) =>
      current
        ? {
            ...current,
            holdings: current.holdings.map((holding) => (holding.id === id ? { ...holding, ...changes } : holding)),
          }
        : current,
    );
    setStatus((current) => (current === 'conflict' ? current : 'clean'));
  }

  function applyTargets(settings: Pick<PortfolioSettings, 'fxLimitPercent' | 'solidTargetPercent' | 'geographyTargets'>): void {
    setPortfolio((current) => (current ? { ...current, settings: { ...current.settings, ...settings } } : current));
    setStatus((current) => (current === 'conflict' ? current : 'clean'));
  }

  function addHolding(draft: HoldingDraft): void {
    if (!portfolio) return;
    const holding: Holding = {
      id: newHoldingId(),
      ...draft,
    };
    setPortfolio({ ...portfolio, holdings: [...portfolio.holdings, holding] });
    setStatus((current) => (current === 'conflict' ? current : 'clean'));
  }

  function deleteHolding(id: string): void {
    if (!portfolio) return;
    const holding = portfolio.holdings.find((item) => item.id === id);
    if (!window.confirm(`למחוק את "${holding?.name || 'השורה'}"?`)) return;
    setPortfolio({ ...portfolio, holdings: portfolio.holdings.filter((item) => item.id !== id) });
    setStatus((current) => (current === 'conflict' ? current : 'clean'));
  }

  function revertChanges(): void {
    if (!serverPortfolio || status === 'conflict') return;
    setPortfolio(clonePortfolio(serverPortfolio));
    setLatestConflict(null);
    setStatus('clean');
  }

  async function savePortfolio(): Promise<void> {
    if (!portfolio || !hasChanges || status === 'saving' || status === 'conflict') return;
    setStatus('saving');
    try {
      const response = await savingsApi.savePortfolio(portfolio);
      applyServerPortfolio(response.portfolio);
      setStatus('saved');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && isRevisionConflictResponse(error.body)) {
        setLatestConflict(clonePortfolio(error.body.portfolio));
        setStatus('conflict');
        return;
      }
      setStatus('error');
    }
  }

  function acceptLatest(): void {
    if (!latestConflict) return;
    applyServerPortfolio(latestConflict);
  }

  if (view === 'loading') return <LoadingScreen />;
  if (view === 'login') return <LoginScreen onLogin={handleLogin} />;
  if (view === 'error') return <ErrorScreen onRetry={() => void loadPortfolio()} />;
  if (!portfolio) return <ErrorScreen onRetry={() => void loadPortfolio()} />;

  return (
    <PortfolioDashboard
      portfolio={portfolio}
      result={result}
      status={status}
      hasChanges={hasChanges}
      onHoldingChange={updateHolding}
      onAddHolding={addHolding}
      onApplyTargets={applyTargets}
      onDeleteHolding={deleteHolding}
      onRevert={revertChanges}
      onSave={() => void savePortfolio()}
      onAcceptLatest={acceptLatest}
      onLogout={() => void handleLogout()}
    />
  );
}
