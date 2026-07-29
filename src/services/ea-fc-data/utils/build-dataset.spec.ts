import { describe, expect, it } from 'vitest';
import type { EaFcRawPlayerRow } from '../interface';
import { buildDataset } from './build-dataset';

function makeRow(overrides: Partial<EaFcRawPlayerRow>): EaFcRawPlayerRow {
  return {
    player_id: '231747',
    short_name: 'K. Mbappé',
    long_name: 'Kylian Mbappé Lottin',
    player_positions: 'ST, LW, LM',
    overall: '91.0',
    potential: '94.0',
    value_eur: '173500000',
    wage_eur: '610000',
    age: '26',
    dob: '1998-12-20',
    height_cm: '182.0',
    weight_kg: '75.0',
    league_id: '53.0',
    league_name: 'La Liga',
    club_team_id: '243.0',
    club_name: 'Real Madrid',
    club_jersey_number: '9.0',
    nationality_id: '18.0',
    nationality_name: 'France',
    preferred_foot: 'Right',
    weak_foot: '4.0',
    skill_moves: '5.0',
    international_reputation: '5.0',
    pace: '97.0',
    shooting: '90.0',
    passing: '81.0',
    dribbling: '92.0',
    defending: '37.0',
    physic: '76.0',
    player_face_url: 'https://cdn.sofifa.net/players/231/747/26_120.png',
    ...overrides,
  };
}

describe('buildDataset()', () => {
  it('coerces float-string numbers to integers', () => {
    const { players } = buildDataset([makeRow({})]);
    expect(players).toHaveLength(1);
    const p = players[0];
    expect(p.eaPlayerId).toEqual(231747);
    expect(p.clubTeamId).toEqual(243);
    expect(p.overall).toEqual(91);
    expect(p.faceStats.physical).toEqual(76);
    expect(p.positions).toEqual(['ST', 'LW', 'LM']);
  });

  it('drops players outside the top-5 leagues (by league_id, not name)', () => {
    const { players } = buildDataset([
      // Ambiguous name "Serie A" but Ecuadorian league_id -> must be dropped.
      makeRow({ league_id: '2018.0', league_name: 'Serie A' }),
      // Real Serie A id.
      makeRow({ league_id: '31.0', league_name: 'Serie A' }),
    ]);
    expect(players).toHaveLength(1);
    expect(players[0].leagueName).toEqual('Serie A');
    expect(players[0].leagueId).toEqual(31);
  });

  it('aggregates teams from players with a computed overall', () => {
    const { teams } = buildDataset([
      makeRow({ player_id: '1', overall: '90' }),
      makeRow({ player_id: '2', overall: '80' }),
    ]);
    expect(teams).toHaveLength(1);
    expect(teams[0].eaTeamId).toEqual(243);
    expect(teams[0].playerCount).toEqual(2);
    expect(teams[0].overall).toEqual(85);
  });

  it('always emits all five leagues with team counts', () => {
    const { leagues } = buildDataset([makeRow({})]);
    expect(leagues).toHaveLength(5);
    const laLiga = leagues.find((l) => l.name === 'La Liga');
    expect(laLiga?.teamCount).toEqual(1);
    expect(leagues.find((l) => l.name === 'Premier League')?.teamCount).toEqual(0);
  });
});
