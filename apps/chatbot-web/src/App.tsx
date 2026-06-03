import { useEffect, useState } from 'react';
import { Route, Router, Switch } from 'wouter';
import { TabBar } from './components/TabBar';
import { api } from './lib/api';
import { todayYmd } from './lib/date';
import { getWebApp } from './lib/telegram';
import { DashboardPage } from './pages/DashboardPage';
import { ExercisePage } from './pages/ExercisePage';
import { ExpensesPage } from './pages/ExpensesPage';

export function App() {
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const w = getWebApp();
    if (w) {
      w.ready();
      w.expand();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const today = todayYmd();
    api
      .dashboard(today)
      .then((d) => {
        if (cancelled) return;
        const overdue = d.reminders.filter((r) => r.status !== 'completed' && r.dueDate.slice(0, 10) < today).length;
        setOverdueCount(overdue);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Router base="/chatbot">
      <div className="min-h-screen flex flex-col pb-16">
        <main className="flex-1">
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/exercise" component={ExercisePage} />
            <Route path="/expenses" component={ExpensesPage} />
            <Route>
              <div className="p-6 text-text-secondary">404</div>
            </Route>
          </Switch>
        </main>
        <TabBar overdueCount={overdueCount} />
      </div>
    </Router>
  );
}
