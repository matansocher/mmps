import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { api } from './lib/api';
import { getWebApp } from './lib/telegram';
import { ExpensesPage } from './pages/ExpensesPage';

export function App() {
  useEffect(() => {
    const w = getWebApp();
    if (w) {
      w.ready();
      w.expand();
    }
    api.notifyMiniAppOpened().catch(() => {});
  }, []);

  return (
    <Router base="/expenses">
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Switch>
            <Route path="/" component={ExpensesPage} />
            <Route>
              <div className="p-6 text-text-secondary">404</div>
            </Route>
          </Switch>
        </main>
      </div>
    </Router>
  );
}
