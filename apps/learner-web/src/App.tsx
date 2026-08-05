import { useEffect } from 'react';
import { Route, Router, Switch } from 'wouter';
import { trackEvent } from './lib/api';
import { ProgressProvider } from './lib/progress';
import { CoursePage } from './pages/CoursePage';
import { HomePage } from './pages/HomePage';

export function App() {
  useEffect(() => {
    trackEvent({ type: 'open' });
  }, []);

  return (
    <ProgressProvider>
      <Router base="/learner">
        <div className="min-h-screen flex flex-col">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/course/:id" component={CoursePage} />
            <Route>
              <div className="p-6 text-text-secondary">404</div>
            </Route>
          </Switch>
        </div>
      </Router>
    </ProgressProvider>
  );
}
