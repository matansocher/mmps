import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { getWebApp } from './lib/telegram';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  useEffect(() => {
    const w = getWebApp();
    if (w) {
      w.ready();
      w.expand();
    }
  }, []);

  return (
    <Router base="/chatbot">
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route>
          <div className="p-6 text-text-secondary">404</div>
        </Route>
      </Switch>
    </Router>
  );
}
