import { Route, Switch, Router } from 'wouter';
import { TopicPickerPage } from './pages/TopicPickerPage';
import { RoundPage } from './pages/RoundPage';
import { SummaryPage } from './pages/SummaryPage';
import { OutOfHeartsPage } from './pages/OutOfHeartsPage';

export function App() {
  return (
    <Router base="/stacker">
      <Switch>
        <Route path="/" component={TopicPickerPage} />
        <Route path="/round" component={RoundPage} />
        <Route path="/summary" component={SummaryPage} />
        <Route path="/out-of-hearts" component={OutOfHeartsPage} />
        <Route>
          <div className="p-6 text-gray-400">Not found</div>
        </Route>
      </Switch>
    </Router>
  );
}
