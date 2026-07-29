import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { League, Team } from '../types';

type Props = {
  readonly onCareerCreated: () => void;
};

export function PickClubScreen({ onCareerCreated }: Props) {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .leagues()
      .then((r) => setLeagues(r.leagues))
      .catch(() => setError('Could not load leagues. Has the data been imported?'));
  }, []);

  async function chooseLeague(league: League) {
    setSelectedLeague(league);
    setTeams([]);
    try {
      const { teams } = await api.teams(league.eaLeagueId);
      setTeams(teams);
    } catch {
      setError('Could not load clubs');
    }
  }

  async function chooseClub(team: Team) {
    try {
      setBusy(true);
      await api.createCareer(team.eaTeamId);
      onCareerCreated();
    } catch {
      setError('Could not create your career');
      setBusy(false);
    }
  }

  if (!selectedLeague) {
    return (
      <div className="container">
        <div className="card">
          <h2>Choose a league</h2>
          <p className="muted">Pick where your managerial journey begins.</p>
          <div className="grid leagues">
            {leagues.map((league) => (
              <div key={league.eaLeagueId} className="pick-tile" onClick={() => chooseLeague(league)}>
                <div className="league-icon">{league.icon}</div>
                <div>{league.name}</div>
                <div className="rating">{league.teamCount} clubs</div>
              </div>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          {!leagues.length && !error && <p className="muted">Loading leagues…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="pick-header">
          <button className="back-btn" onClick={() => setSelectedLeague(null)}>
            ← Leagues
          </button>
          <h2>
            {selectedLeague.icon} {selectedLeague.name}
          </h2>
        </div>
        <p className="muted">Choose your club.</p>
        <div className="grid clubs">
          {teams.map((team) => (
            <div key={team.eaTeamId} className="pick-tile" onClick={() => !busy && chooseClub(team)}>
              <img src={team.logoUrl} alt={team.name} loading="lazy" />
              <div>{team.name}</div>
              <div className="rating">OVR {team.overall}</div>
            </div>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        {!teams.length && !error && <p className="muted">Loading clubs…</p>}
      </div>
    </div>
  );
}
