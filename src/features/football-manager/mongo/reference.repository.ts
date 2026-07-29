import type { AnyBulkWriteOperation } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { EaFcDataset } from '@services/ea-fc-data';
import { FOOTBALL_MANAGER_DB_NAME, LEAGUES_COLLECTION, PLAYERS_COLLECTION, TEAMS_COLLECTION } from '../constants';
import type { LeagueDocument, PlayerDocument, TeamDocument } from '../types';

function getLeaguesCollection() {
  return getMongoCollection<LeagueDocument>(FOOTBALL_MANAGER_DB_NAME, LEAGUES_COLLECTION);
}

function getTeamsCollection() {
  return getMongoCollection<TeamDocument>(FOOTBALL_MANAGER_DB_NAME, TEAMS_COLLECTION);
}

function getPlayersCollection() {
  return getMongoCollection<PlayerDocument>(FOOTBALL_MANAGER_DB_NAME, PLAYERS_COLLECTION);
}

// Idempotent bulk upsert of the whole reference dataset, keyed by EA numeric id.
export async function importReferenceData(dataset: EaFcDataset): Promise<{ leagues: number; teams: number; players: number }> {
  const leagueOps: AnyBulkWriteOperation<LeagueDocument>[] = dataset.leagues.map((league) => ({
    updateOne: { filter: { _id: league.eaLeagueId }, update: { $set: { ...league, _id: league.eaLeagueId } }, upsert: true },
  }));
  const teamOps: AnyBulkWriteOperation<TeamDocument>[] = dataset.teams.map((team) => ({
    updateOne: { filter: { _id: team.eaTeamId }, update: { $set: { ...team, _id: team.eaTeamId } }, upsert: true },
  }));
  const playerOps: AnyBulkWriteOperation<PlayerDocument>[] = dataset.players.map((player) => ({
    updateOne: { filter: { _id: player.eaPlayerId }, update: { $set: { ...player, _id: player.eaPlayerId } }, upsert: true },
  }));

  if (leagueOps.length) await getLeaguesCollection().bulkWrite(leagueOps, { ordered: false });
  if (teamOps.length) await getTeamsCollection().bulkWrite(teamOps, { ordered: false });
  if (playerOps.length) await getPlayersCollection().bulkWrite(playerOps, { ordered: false });

  return { leagues: dataset.leagues.length, teams: dataset.teams.length, players: dataset.players.length };
}

export async function getAllLeagues(): Promise<LeagueDocument[]> {
  return getLeaguesCollection().find().sort({ name: 1 }).toArray();
}

export async function getTeamsByLeague(leagueId: number): Promise<TeamDocument[]> {
  return getTeamsCollection().find({ leagueId }).sort({ overall: -1 }).toArray();
}

export async function getAllTeams(): Promise<TeamDocument[]> {
  return getTeamsCollection().find().sort({ overall: -1 }).toArray();
}

export async function getTeamById(eaTeamId: number): Promise<TeamDocument | null> {
  return getTeamsCollection().findOne({ _id: eaTeamId });
}

export async function getPlayersByTeam(clubTeamId: number): Promise<PlayerDocument[]> {
  return getPlayersCollection().find({ clubTeamId }).sort({ overall: -1 }).toArray();
}

export async function getPlayerById(eaPlayerId: number): Promise<PlayerDocument | null> {
  return getPlayersCollection().findOne({ _id: eaPlayerId });
}

export async function countReferenceData(): Promise<{ leagues: number; teams: number; players: number }> {
  const [leagues, teams, players] = await Promise.all([
    getLeaguesCollection().countDocuments(),
    getTeamsCollection().countDocuments(),
    getPlayersCollection().countDocuments(),
  ]);
  return { leagues, teams, players };
}
