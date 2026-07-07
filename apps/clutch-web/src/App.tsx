import { Route, Router, Switch, useLocation } from 'wouter';
import { useEffect } from 'react';
import type { LeagueSelection } from './lib/leagues';
import { isSelection } from './lib/leagues';
import { Home } from './modes/Home';
import { LeagueSelect, type GameId } from './modes/LeagueSelect';
import { DailyBracket } from './modes/DailyBracket';
import { DecadeChampions } from './modes/DecadeChampions';
import { RapidFire } from './modes/RapidFire';
import { WhoLifted } from './modes/WhoLifted';
import { Finalists } from './modes/Finalists';
import { ChampionOrChump } from './modes/ChampionOrChump';
import { ClutchDaily } from './modes/ClutchDaily';
import { Records } from './modes/Records';
import { ClutchGrid } from './modes/ClutchGrid';

const GAMES: readonly GameId[] = ['daily', 'decades', 'rapid', 'lifted', 'finalists', 'chump'];

function isGame(value: string): value is GameId {
  return (GAMES as readonly string[]).includes(value);
}

function Play({ game, league }: { game: GameId; league: LeagueSelection }) {
  if (game === 'daily') return <DailyBracket league={league} />;
  if (game === 'decades') return <DecadeChampions league={league} />;
  if (game === 'lifted') return <WhoLifted league={league} />;
  if (game === 'finalists') return <Finalists league={league} />;
  if (game === 'chump') return <ChampionOrChump league={league} />;
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
          <Route path="/today" component={ClutchDaily} />
          <Route path="/records" component={Records} />
          <Route path="/grid" component={ClutchGrid} />
          <Route path="/:game/:league">
            {            (p) => (isGame(p.game) && isSelection(p.league) ? <Play game={p.game} league={p.league} /> : <Redirect to="/" />)}
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
