import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { LineupEditor } from '../components/LineupEditor';
import { LiveMatch } from '../components/LiveMatch';
import { PreMatch } from '../components/PreMatch';
import type {
  AdvanceResult,
  Career,
  FixtureRow,
  FormationDef,
  LiveMatchSquads,
  LiveMatchView,
  MarketPlayer,
  SeasonSummary,
  SquadPlayer,
  StandingRow,
  Team,
  TopScorer,
  TransfersDashboard,
} from '../types';

type Tab = 'match' | 'squad' | 'table' | 'fixtures' | 'scorers' | 'transfers';

type NextOpponent = {
  readonly name: string;
  readonly logoUrl: string;
  readonly isHome: boolean;
  readonly matchday: number;
};

type Props = {
  readonly career: Career;
  readonly onCareerChanged: () => void;
};

export function CareerScreen({ career, onCareerChanged }: Props) {
  const [tab, setTab] = useState<Tab>('match');
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [lineup, setLineup] = useState<number[]>([]);
  const [resolvedStarters, setResolvedStarters] = useState<number[]>([]);
  const [formations, setFormations] = useState<readonly FormationDef[]>([]);
  const [formationId, setFormationId] = useState<string>('4-3-3');
  const [preMatch, setPreMatch] = useState(false);
  const [squadMatchday, setSquadMatchday] = useState<number>(0);
  const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
  const [scorers, setScorers] = useState<TopScorer[]>([]);
  const [maxMatchday, setMaxMatchday] = useState<number>(0);
  const [lastResult, setLastResult] = useState<AdvanceResult | null>(null);
  const [live, setLive] = useState<{ view: LiveMatchView; squads: LiveMatchSquads } | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [transfers, setTransfers] = useState<TransfersDashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seasonComplete = maxMatchday > 0 && career.currentMatchday > maxMatchday;

  // The manager's fixture for the current matchday — used to preview the opponent
  // on the Match tab and above the pre-match XI so the user knows who they face.
  const nextFixture = fixtures.find((f) => f.isUserMatch && f.matchday === career.currentMatchday && !f.played) ?? null;
  const nextOpponent: NextOpponent | null =
    nextFixture && team
      ? (() => {
          const isHome = nextFixture.homeTeamId === team.eaTeamId;
          return {
            name: isHome ? nextFixture.awayTeamName : nextFixture.homeTeamName,
            logoUrl: isHome ? nextFixture.awayLogoUrl : nextFixture.homeLogoUrl,
            isHome,
            matchday: nextFixture.matchday,
          };
        })()
      : null;

  const loadTransfers = useCallback(async () => {
    try {
      setTransfers(await api.transfers());
    } catch {
      setTransfers(null);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [squad, fx, sc] = await Promise.all([api.squad(), api.fixtures(), api.scorers()]);
      setTeam(squad.team);
      setPlayers(squad.players);
      setLineup(squad.lineup);
      setResolvedStarters(squad.resolvedStarters);
      setFormations(squad.formations);
      setFormationId(squad.formationId);
      setSquadMatchday(squad.currentMatchday);
      setFixtures(fx.fixtures);
      setMaxMatchday(fx.maxMatchday);
      setScorers(sc.scorers);
      await loadTransfers();
    } catch {
      setError('Failed to load your club');
    }
  }, [loadTransfers]);

  useEffect(() => {
    void load();
  }, [load]);

  // Load a season summary whenever the season is complete.
  useEffect(() => {
    if (!seasonComplete) return;
    let cancelled = false;
    const run = async () => {
      try {
        const s = await api.seasonSummary();
        if (!cancelled) setSummary(s);
      } catch {
        if (!cancelled) setSummary(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [seasonComplete]);

  async function playNextMatch() {
    try {
      setBusy(true);
      setError(null);
      const result = await api.advance();
      setLastResult(result);
      await load();
      onCareerChanged();
    } catch (err) {
      setError(err instanceof Error && err.message === 'season_complete' ? 'The season is complete!' : 'Could not play the match');
    } finally {
      setBusy(false);
    }
  }

  function watchMatch() {
    setError(null);
    setLastResult(null);
    setPreMatch(true);
  }

  async function kickOff(starters: number[], chosenFormationId: string) {
    try {
      setBusy(true);
      setError(null);
      await api.setLineup(starters, chosenFormationId);
      const state = await api.matchStart();
      setPreMatch(false);
      setLive(state);
    } catch (err) {
      setError(err instanceof Error && err.message === 'season_complete' ? 'The season is complete!' : 'Could not start the match');
    } finally {
      setBusy(false);
    }
  }

  async function onLiveFinished(result: AdvanceResult) {
    setLive(null);
    setLastResult(result);
    await load();
    onCareerChanged();
  }

  async function startNewSeason() {
    try {
      setBusy(true);
      setError(null);
      await api.newSeason();
      setLastResult(null);
      setSummary(null);
      await load();
      onCareerChanged();
      setTab('match');
    } catch {
      setError('Could not start the new season');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      {team && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="squad-header">
            <img src={team.logoUrl} alt={team.name} />
            <div>
              <h2 style={{ margin: 0 }}>{team.name}</h2>
              <div className="muted">
                Season {career.seasonNumber} · {seasonComplete ? 'Season complete' : `Matchday ${career.currentMatchday}`}
              </div>
            </div>
            <div className="rating-badge">OVR {team.overall}</div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={tab === 'match' ? 'active' : ''} onClick={() => setTab('match')}>
          Match
        </button>
        <button className={tab === 'squad' ? 'active' : ''} onClick={() => setTab('squad')}>
          Squad
        </button>
        <button className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
          Table
        </button>
        <button className={tab === 'fixtures' ? 'active' : ''} onClick={() => setTab('fixtures')}>
          Fixtures
        </button>
        <button className={tab === 'scorers' ? 'active' : ''} onClick={() => setTab('scorers')}>
          Scorers
        </button>
        <button className={tab === 'transfers' ? 'active' : ''} onClick={() => setTab('transfers')}>
          Transfers
          {transfers && transfers.offers.length > 0 && <span className="badge">{transfers.offers.length}</span>}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {tab === 'match' && (
        <div className="card">
          {seasonComplete ? (
            <SeasonComplete summary={summary} busy={busy} onNewSeason={startNewSeason} />
          ) : live ? (
            <LiveMatch initialView={live.view} initialSquads={live.squads} onFinished={onLiveFinished} />
          ) : preMatch ? (
            <PreMatch
              formations={formations}
              initialFormationId={formationId}
              players={players}
              initialStarters={resolvedStarters}
              busy={busy}
              opponent={nextOpponent}
              teamName={team?.name ?? null}
              teamLogoUrl={team?.logoUrl ?? null}
              onKickOff={kickOff}
            />
          ) : (
            <div className="fm-match-landing">
              {nextOpponent && team && (
                <MatchPreview teamName={team.name} teamLogoUrl={team.logoUrl} opponent={nextOpponent} />
              )}
              <div className="actions">
                <button onClick={watchMatch} disabled={busy}>
                  {busy ? 'Loading…' : `▶ Play matchday ${career.currentMatchday}`}
                </button>
                <button className="secondary" onClick={playNextMatch} disabled={busy}>
                  {busy ? 'Simulating…' : 'Quick sim'}
                </button>
              </div>
              <p className="muted fm-match-hint">Play to watch it live and pick your XI, or quick-sim for an instant result.</p>
            </div>
          )}

          {lastResult?.userMatch &&
            (() => {
              const um = lastResult.userMatch;
              const home = team?.eaTeamId === um.homeTeamId;
              const us = home ? um.homeGoals : um.awayGoals;
              const them = home ? um.awayGoals : um.homeGoals;
              const outcome = us > them ? 'win' : us < them ? 'loss' : 'draw';
              const outcomeLabel = outcome === 'win' ? 'Win' : outcome === 'loss' ? 'Defeat' : 'Draw';
              return (
                <div className={`fm-result fm-result-${outcome}`}>
                  <p className="fm-result-tag">Full time · {outcomeLabel}</p>
                  <div className="scoreline">
                    <span className={`team${home ? ' you' : ''}`}>{um.homeTeamName}</span>
                    <span className="score">
                      {um.homeGoals} – {um.awayGoals}
                    </span>
                    <span className={`team${!home ? ' you' : ''}`}>{um.awayTeamName}</span>
                  </div>
                  {um.goals.length > 0 && (
                    <ul className="goal-list">
                      {um.goals.map((g, i) => (
                        <li key={i}>
                          ⚽ {g.minute}&apos; {g.playerName}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

          {lastResult && lastResult.otherResults.length > 0 && (
            <div>
              <p className="section-title">Around the league</p>
              {lastResult.otherResults.map((r, i) => (
                <div key={i} className="result-row">
                  <span className="rr-home">{r.homeTeamName}</span>
                  <span className="rr-score">
                    {r.homeGoals} – {r.awayGoals}
                  </span>
                  <span className="rr-away">{r.awayTeamName}</span>
                </div>
              ))}
            </div>
          )}

          {!lastResult && !seasonComplete && !preMatch && !live && !nextOpponent && (
            <p className="muted">Your fixtures are loading — kick off your first match to see the result here.</p>
          )}
        </div>
      )}

      {tab === 'squad' && (
        <SquadTab
          players={players}
          lineup={lineup}
          resolvedStarters={resolvedStarters}
          formations={formations}
          formationId={formationId}
          currentMatchday={squadMatchday}
          onLineupSaved={load}
        />
      )}

      {tab === 'table' && <TableTab defaultLeagueId={career.leagueId} clubId={team?.eaTeamId} />}

      {tab === 'fixtures' && <FixturesList fixtures={fixtures} clubId={team?.eaTeamId} currentMatchday={career.currentMatchday} />}

      {tab === 'scorers' && (
        <div className="card">
          {scorers.length ? (
            scorers.map((s, i) => (
              <div key={s.playerId} className="player-row">
                <span className="rank">{i + 1}</span>
                <img className="face" src={s.faceUrl} alt={s.playerName} loading="lazy" />
                <div>
                  <div className="name">{s.playerName}</div>
                  <div className="pos">
                    <img className="mini-logo" src={s.logoUrl} alt="" loading="lazy" /> {s.teamName}
                  </div>
                </div>
                <div className="ovr">{s.goals}</div>
              </div>
            ))
          ) : (
            <p className="muted">No goals scored yet. Play some matches!</p>
          )}
        </div>
      )}

      {tab === 'transfers' && <TransfersTab data={transfers} onChanged={loadTransfers} onSquadChanged={load} />}
    </div>
  );
}

function MatchPreview({ teamName, teamLogoUrl, opponent }: { readonly teamName: string; readonly teamLogoUrl: string; readonly opponent: NextOpponent }) {
  return (
    <div className="fm-preview">
      <div className="fm-preview-head">
        <span className="fm-preview-md">Matchday {opponent.matchday}</span>
        <span className={`fm-preview-venue ${opponent.isHome ? 'home' : 'away'}`}>{opponent.isHome ? 'Home' : 'Away'}</span>
      </div>
      <div className="fm-preview-teams">
        <div className="fm-preview-team">
          <img src={teamLogoUrl} alt="" loading="lazy" />
          <span>{teamName}</span>
        </div>
        <span className="fm-preview-vs">vs</span>
        <div className="fm-preview-team">
          <img src={opponent.logoUrl} alt="" loading="lazy" />
          <span>{opponent.name}</span>
        </div>
      </div>
    </div>
  );
}

function SquadTab({
  players,
  lineup,
  resolvedStarters,
  formations,
  formationId,
  currentMatchday,
  onLineupSaved,
}: {
  readonly players: readonly SquadPlayer[];
  readonly lineup: readonly number[];
  readonly resolvedStarters: readonly number[];
  readonly formations: readonly FormationDef[];
  readonly formationId: string;
  readonly currentMatchday: number;
  readonly onLineupSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  // Re-seed the editor whenever the saved lineup changes upstream.
  useEffect(() => {
    setResetSignal((n) => n + 1);
    setSavedNote(false);
  }, [lineup, formationId]);

  const save = async (starters: number[], chosenFormationId: string) => {
    setSaving(true);
    setError(null);
    setSavedNote(false);
    try {
      await api.setLineup(starters, chosenFormationId);
      await onLineupSaved();
      setSavedNote(true);
    } catch {
      setError('Could not save the lineup.');
    } finally {
      setSaving(false);
    }
  };

  const initialStarters = resolvedStarters.length ? resolvedStarters : lineup;

  return (
    <div className="card">
      {error && <p className="error">{error}</p>}
      {savedNote && !saving && <p className="muted small">✓ Lineup saved · next matchday: {currentMatchday}</p>}
      <LineupEditor
        formations={formations}
        initialFormationId={formationId}
        players={players}
        initialStarters={initialStarters}
        busy={saving}
        intro="Set the eleven that starts your next match. Drag any player onto another to swap — pitch to pitch, or a substitute onto the pitch."
        actionLabel="Save XI"
        busyLabel="Saving…"
        onCommit={(starters, chosenFormationId) => void save(starters, chosenFormationId)}
        resetSignal={resetSignal}
      />
      {!players.length && <p className="muted">Loading squad…</p>}
    </div>
  );
}

function SeasonComplete({ summary, busy, onNewSeason }: { readonly summary: SeasonSummary | null; readonly busy: boolean; readonly onNewSeason: () => void }) {
  return (
    <div className="season-summary">
      <h2>🏆 Season {summary?.seasonNumber ?? ''} complete</h2>
      {summary && (
        <>
          <p>
            <strong>Champions:</strong> {summary.champion.teamName}
          </p>
          <p>
            <strong>Your finish:</strong> {summary.clubPosition > 0 ? ordinal(summary.clubPosition) : '—'}
          </p>
          {summary.topScorer && (
            <p>
              <strong>Golden Boot:</strong> {summary.topScorer.playerName} ({summary.topScorer.teamName}) — {summary.topScorer.goals} goals
            </p>
          )}
        </>
      )}
      <div className="actions">
        <button onClick={onNewSeason} disabled={busy}>
          {busy ? 'Starting…' : 'Start next season'}
        </button>
      </div>
    </div>
  );
}

function TableTab({ defaultLeagueId, clubId }: { readonly defaultLeagueId: number; readonly clubId?: number }) {
  const [leagueId, setLeagueId] = useState<number>(defaultLeagueId);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [leagues, setLeagues] = useState<{ leagueId: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await api.table(leagueId);
        if (cancelled) return;
        setStandings(res.standings);
        if (res.leagues) setLeagues(res.leagues);
      } catch {
        /* leave prior standings in place */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  return (
    <div className="card">
      {leagues.length > 0 && (
        <div className="league-switch">
          <label className="muted" htmlFor="league-select">
            League
          </label>
          <select id="league-select" value={leagueId} onChange={(e) => setLeagueId(Number(e.target.value))}>
            {leagues.map((l) => (
              <option key={l.leagueId} value={l.leagueId}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <table className="standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Club</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.teamId} className={clubId && row.teamId === clubId ? 'you' : ''}>
              <td>{i + 1}</td>
              <td>
                <span className="club">
                  <img src={row.logoUrl} alt="" loading="lazy" />
                  {row.teamName}
                </span>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>
                {row.goalDifference > 0 ? '+' : ''}
                {row.goalDifference}
              </td>
              <td>
                <strong>{row.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && !standings.length && <p className="muted">Loading table…</p>}
    </div>
  );
}

function FixturesList({ fixtures, clubId, currentMatchday }: { readonly fixtures: readonly FixtureRow[]; readonly clubId?: number; readonly currentMatchday: number }) {
  const [view, setView] = useState<'all' | 'calendar'>('all');
  const currentMdRef = useRef<HTMLDivElement | null>(null);

  const byMatchday = new Map<number, FixtureRow[]>();
  for (const f of fixtures) {
    const list = byMatchday.get(f.matchday) ?? [];
    list.push(f);
    byMatchday.set(f.matchday, list);
  }
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  // Calendar view: only the manager's own fixtures, chronological.
  const myFixtures = fixtures.filter((f) => clubId && f.isUserMatch).sort((a, b) => a.matchday - b.matchday);

  // Auto-scroll the current matchday into view when the All-fixtures list mounts
  // or when the matchday changes.
  useEffect(() => {
    if (view !== 'all') return;
    currentMdRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [view, currentMatchday, fixtures.length]);

  return (
    <div className="card">
      <div className="sub-tabs">
        <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>
          All fixtures
        </button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
          My calendar
        </button>
      </div>

      {view === 'all' &&
        matchdays.map((md) => (
          <div key={md} ref={md === currentMatchday ? currentMdRef : undefined} className={`matchday-block${md === currentMatchday ? ' is-current' : ''}`}>
            <p className="section-title">
              Matchday {md}
              {md === currentMatchday && <span className="md-current-tag">Current</span>}
            </p>
            {byMatchday.get(md)!.map((f, i) => (
              <div key={i} className={`fixture-row${clubId && f.isUserMatch ? ' you' : ''}`}>
                <span className="fx-team home">
                  {f.homeTeamName}
                  <img src={f.homeLogoUrl} alt="" loading="lazy" />
                </span>
                <span className="fx-score">{f.played ? `${f.homeGoals} – ${f.awayGoals}` : 'vs'}</span>
                <span className="fx-team away">
                  <img src={f.awayLogoUrl} alt="" loading="lazy" />
                  {f.awayTeamName}
                </span>
              </div>
            ))}
          </div>
        ))}

      {view === 'calendar' && (
        <div className="calendar-list">
          {myFixtures.map((f, i) => {
            const isHome = f.homeTeamId === clubId;
            const oppName = isHome ? f.awayTeamName : f.homeTeamName;
            const oppLogo = isHome ? f.awayLogoUrl : f.homeLogoUrl;
            const myGoals = isHome ? f.homeGoals : f.awayGoals;
            const oppGoals = isHome ? f.awayGoals : f.homeGoals;
            const outcome = f.played && myGoals != null && oppGoals != null ? (myGoals > oppGoals ? 'win' : myGoals < oppGoals ? 'loss' : 'draw') : null;
            const upcoming = !f.played && f.matchday === currentMatchday;
            return (
              <div key={i} className={`cal-row${upcoming ? ' next' : ''}${outcome ? ` ${outcome}` : ''}`}>
                <span className="cal-md">MD {f.matchday}</span>
                <span className={`cal-venue ${isHome ? 'home' : 'away'}`}>{isHome ? 'H' : 'A'}</span>
                <span className="cal-opp">
                  <img src={oppLogo} alt="" loading="lazy" />
                  {oppName}
                </span>
                {f.played && myGoals != null && oppGoals != null ? (
                  <span className={`cal-result ${outcome ?? ''}`}>
                    {isHome ? `${f.homeGoals} – ${f.awayGoals}` : `${f.awayGoals} – ${f.homeGoals}`}
                  </span>
                ) : (
                  <span className="cal-result upcoming">{upcoming ? 'Next' : '—'}</span>
                )}
              </div>
            );
          })}
          {!myFixtures.length && <p className="muted">No fixtures for your club this season.</p>}
        </div>
      )}

      {!fixtures.length && <p className="muted">Loading fixtures…</p>}
    </div>
  );
}

function fmtMoney(v: number): string {
  if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`;
  return `€${v}`;
}

const MARKET_POSITIONS = ['GK', 'RB', 'CB', 'LB', 'RWB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'] as const;

function TransfersTab({ data, onChanged, onSquadChanged }: { readonly data: TransfersDashboard | null; readonly onChanged: () => Promise<void>; readonly onSquadChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [results, setResults] = useState<MarketPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [bidTarget, setBidTarget] = useState<MarketPlayer | null>(null);

  async function search() {
    setSearching(true);
    setFlash(null);
    try {
      const res = await api.market({ name: name || undefined, position: position || undefined, maxValue: maxValue ? Number(maxValue) * 1_000_000 : undefined });
      setResults(res.players);
    } catch {
      setFlash('Search failed');
    } finally {
      setSearching(false);
    }
  }

  async function confirmBid(p: MarketPlayer, amount: number) {
    setBidTarget(null);
    setBusyId(p.playerId);
    setFlash(null);
    try {
      const res = await api.bid(p.playerId, amount);
      if (res.outcome === 'accept') setFlash(`✅ Signed ${p.name}!`);
      else if (res.outcome === 'counter') setFlash(`↩️ ${p.teamName} countered at ${fmtMoney(res.counterAmount ?? 0)} — see your bids below.`);
      else setFlash(`❌ ${p.teamName} rejected your bid for ${p.name}.`);
      await Promise.all([onChanged(), onSquadChanged()]);
    } catch (err) {
      setFlash(bidError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function respondBid(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await api.respondBid(id, accept);
      await Promise.all([onChanged(), onSquadChanged()]);
    } catch (err) {
      setFlash(bidError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function respondOffer(id: string, accept: boolean) {
    setBusyId(id);
    try {
      await api.respondOffer(id, accept);
      await Promise.all([onChanged(), onSquadChanged()]);
    } catch (err) {
      setFlash(bidError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (!data) return <div className="card"><p className="muted">Loading transfers…</p></div>;

  return (
    <div className="card transfers">
      <div className="transfer-banner">
        <div>
          <div className="muted">Budget</div>
          <div className="budget">{fmtMoney(data.budget)}</div>
        </div>
        <div className={`window-pill ${data.windowOpen ? 'open' : 'closed'}`}>
          {data.windowOpen ? `${data.window === 'summer' ? '☀️ Summer' : '❄️ Winter'} window open` : 'Window closed'}
          <span className="muted"> · {data.signingsThisWindow}/4 signings</span>
        </div>
      </div>

      {flash && <p className="section-title" style={{ color: 'var(--accent, #4ade80)' }}>{flash}</p>}

      {data.offers.length > 0 && (
        <div className="transfer-section">
          <p className="section-title">📥 Incoming offers</p>
          {data.offers.map((o) => (
            <div key={o.id} className="offer-card">
              <img className="offer-face" src={o.faceUrl} alt={o.playerName} loading="lazy" />
              <div className="offer-info">
                <div className="offer-name">
                  {o.playerName}
                  {o.overall != null && <span className="offer-ovr" title="Overall">{o.overall}</span>}
                </div>
                <div className="offer-meta">
                  {o.positions && o.positions.length > 0 && <span className="offer-pos">{o.positions.join('/')}</span>}
                  <span className="muted">Offer expires MD {o.expiresMatchday}</span>
                </div>
                <div className="offer-bid">
                  <span className="muted">{o.fromTeamName} bid</span>
                  <span className="offer-amount">{fmtMoney(o.amount)}</span>
                </div>
              </div>
              <div className="offer-actions">
                <button className="offer-accept" disabled={busyId === o.id} onClick={() => respondOffer(o.id, true)}>
                  ✅ Accept {fmtMoney(o.amount)}
                </button>
                <button className="ghost offer-reject" disabled={busyId === o.id} onClick={() => respondOffer(o.id, false)}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.bids.length > 0 && (
        <div className="transfer-section">
          <p className="section-title">📤 Your bids</p>
          {data.bids.map((b) => (
            <div key={b.id} className="transfer-row">
              <div>
                <div className="name">{b.playerName}</div>
                <div className="pos">
                  {b.teamName} · {fmtMoney(b.amount)}
                  {b.status === 'countered' && b.counterAmount != null && ` · countered at ${fmtMoney(b.counterAmount)}`}
                </div>
              </div>
              {b.status === 'countered' ? (
                <div className="transfer-actions">
                  <button disabled={busyId === b.id} onClick={() => respondBid(b.id, true)}>Accept</button>
                  <button className="ghost" disabled={busyId === b.id} onClick={() => respondBid(b.id, false)}>Withdraw</button>
                </div>
              ) : (
                <span className="pos">{b.status}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="transfer-section">
        <p className="section-title">🔎 Transfer market</p>
        <div className="market-filters">
          <input placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={position} onChange={(e) => setPosition(e.target.value)} aria-label="Position">
            <option value="">Any position</option>
            {MARKET_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <input placeholder="Max €M" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} inputMode="numeric" />
          <button onClick={search} disabled={searching}>{searching ? '…' : 'Search'}</button>
        </div>
        {results.map((p) => (
          <div key={p.playerId} className="transfer-row market-row">
            <img className="face" src={p.faceUrl} alt={p.name} loading="lazy" />
            <div className="grow">
              <div className="name">{p.name}</div>
              <div className="pos">
                <img className="mini-logo" src={p.logoUrl} alt="" loading="lazy" /> {p.teamName} · {p.positions.join('/')} · {p.age}y · {fmtMoney(p.value)}
              </div>
            </div>
            <div className="ovr" title="Overall">{p.overall}</div>
            {p.potential != null && <div className="pot" title="Potential">{p.potential}</div>}
            <button disabled={!data.windowOpen || busyId === p.playerId} onClick={() => setBidTarget(p)}>Bid</button>
          </div>
        ))}
        {!results.length && <p className="muted">Search for players to buy — from any league. Results are sorted by cost. Bids are only allowed while a window is open.</p>}
      </div>

      {data.news.length > 0 && (
        <div className="transfer-section">
          <p className="section-title">📰 Transfer news</p>
          {data.news.map((n, i) => (
            <div key={i} className="result-row">
              <span>{n.playerName}</span>
              <span className="muted">{n.fromTeamName} → {n.toTeamName}</span>
              <span>{fmtMoney(n.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {bidTarget && <BidModal player={bidTarget} budget={data.budget} onCancel={() => setBidTarget(null)} onConfirm={confirmBid} />}
    </div>
  );
}

function BidModal({ player, budget, onCancel, onConfirm }: { readonly player: MarketPlayer; readonly budget: number; readonly onCancel: () => void; readonly onConfirm: (p: MarketPlayer, amount: number) => void }) {
  const [millions, setMillions] = useState<string>((player.value / 1_000_000).toFixed(1));
  const amount = Math.round(Number(millions) * 1_000_000);
  const valid = Number.isFinite(amount) && amount > 0;
  const overBudget = valid && amount > budget;
  const pctOfValue = valid ? Math.round((amount / Math.max(player.value, 1)) * 100) : 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="modal-card bid-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel} aria-label="Close">✕</button>
        <div className="bid-modal-head">
          <img className="face" src={player.faceUrl} alt={player.name} loading="lazy" />
          <div>
            <div className="name">{player.name}</div>
            <div className="pos">
              <img className="mini-logo" src={player.logoUrl} alt="" loading="lazy" /> {player.teamName} · {player.positions.join('/')} · {player.age}y
            </div>
          </div>
          <div className="ovr" title="Overall">{player.overall}</div>
        </div>
        <div className="bid-modal-stats">
          <div><span className="muted">Market value</span><strong>{fmtMoney(player.value)}</strong></div>
          <div><span className="muted">Your budget</span><strong>{fmtMoney(budget)}</strong></div>
        </div>
        <label className="bid-field">
          <span className="muted">Your bid (€ millions)</span>
          <input autoFocus inputMode="decimal" value={millions} onChange={(e) => setMillions(e.target.value)} />
        </label>
        {valid && <div className={`bid-hint ${pctOfValue >= 85 ? 'good' : pctOfValue >= 60 ? 'ok' : 'low'}`}>{fmtMoney(amount)} · {pctOfValue}% of value</div>}
        {overBudget && <div className="bid-hint low">Exceeds your budget of {fmtMoney(budget)}.</div>}
        <div className="bid-modal-actions">
          <button className="ghost" onClick={onCancel}>Cancel</button>
          <button className="bid-confirm" disabled={!valid || overBudget} onClick={() => onConfirm(player, amount)}>
            Submit bid
          </button>
        </div>
      </div>
    </div>
  );
}

function bidError(err: unknown): string {
  const code = err instanceof Error ? err.message : 'error';
  const map: Record<string, string> = {
    window_closed: 'The transfer window is closed.',
    signing_cap_reached: 'You have hit your 4-signing limit this window.',
    insufficient_budget: 'Not enough budget for that bid.',
    already_yours: 'That player is already in your squad.',
    cannot_complete: 'Deal could not be completed (budget/cap).',
    offer_expired: 'That offer has expired.',
  };
  return map[code] ?? 'Something went wrong.';
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
