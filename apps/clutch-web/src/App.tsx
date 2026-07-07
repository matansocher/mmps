import { Route, Router, Switch, useLocation } from 'wouter';
import { useEffect } from 'react';
import type { League } from './types';
import { isLeague } from './lib/leagues';
import { Home } from './modes/Home';
import { LeagueSelect, type GameId } from './modes/LeagueSelect';
import { DailyBracket } from './modes/DailyBracket';
import { DecadeChampions } from './modes/DecadeChampions';
import { RapidFire } from './modes/RapidFire';

const GAMES: readonly GameId[] = ['daily', 'decades', 'rapid'];

function isGame(value: string): value is GameId {
  return (GAMES as readonly string[]).includes(value);
}

function Play({ game, league }: { game: GameId; league: League }) {
  if (game === 'daily') return <DailyBracket league={league} />;
  if (game === 'decades') return <DecadeChampions league={league} />;
  return <RapidFire league={league} />;
}

function Redirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => navigate(to, { replace: true }), [to, navigate]);
  return null;
}

export function App() {
  return (
    <Router base="/clutch">
      <div className="min-h-full">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/:game/:league">
            {(p) => (isGame(p.game) && isLeague(p.league) ? <Play game={p.game} league={p.league} /> : <Redirect to="/" />)}
          </Route>
          <Route path="/:game">{(p) => (isGame(p.game) ? <LeagueSelect game={p.game} /> : <Redirect to="/" />)}</Route>
          <Route>
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}
