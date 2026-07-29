import { getMongoCollection } from '@core/mongo';
import { generateRoundRobin } from '../engine';
import { CAREERS_COLLECTION, FIXTURES_COLLECTION, FOOTBALL_MANAGER_DB_NAME, GOAL_SCORERS_COLLECTION, SEASON_ARCHIVES_COLLECTION } from '../constants';
import type { CareerDocument, FixtureDocument, GoalScorerDocument, SeasonArchiveDocument } from '../types';
import { getAllTeams } from './reference.repository';

function getCareersCollection() {
  return getMongoCollection<CareerDocument>(FOOTBALL_MANAGER_DB_NAME, CAREERS_COLLECTION);
}

function getFixturesCollection() {
  return getMongoCollection<FixtureDocument>(FOOTBALL_MANAGER_DB_NAME, FIXTURES_COLLECTION);
}

function getScorersCollection() {
  return getMongoCollection<GoalScorerDocument>(FOOTBALL_MANAGER_DB_NAME, GOAL_SCORERS_COLLECTION);
}

function getSeasonArchivesCollection() {
  return getMongoCollection<SeasonArchiveDocument>(FOOTBALL_MANAGER_DB_NAME, SEASON_ARCHIVES_COLLECTION);
}

export async function getCareerByUser(userId: string): Promise<CareerDocument | null> {
  return getCareersCollection().findOne({ userId });
}

// Creates a fresh career for the user: picks a club, generates the full league
// schedule, and resets any prior career (one active career per user in MVP).
export async function createCareer(userId: string, clubTeamId: number, leagueId: number): Promise<CareerDocument> {
  const careerId = userId;
  const now = new Date();

  await Promise.all([
    getFixturesCollection().deleteMany({ careerId }),
    getScorersCollection().deleteMany({ careerId }),
    getSeasonArchivesCollection().deleteMany({ careerId }),
  ]);

  const career: CareerDocument = { _id: careerId, userId, clubTeamId, leagueId, seasonNumber: 1, currentMatchday: 1, createdAt: now };
  await getCareersCollection().replaceOne({ _id: careerId }, career, { upsert: true });

  await generateSeasonFixtures(careerId, clubTeamId, 1);

  return career;
}

// Builds and persists a full double round-robin schedule for EVERY league, so
// the whole football world is simulated in parallel (each league advances one
// matchday per user advance). Leagues are independent round-robins; matchdays
// align by index and shorter leagues (18 clubs) naturally finish earlier.
async function generateSeasonFixtures(careerId: string, clubTeamId: number, seasonNumber: number): Promise<void> {
  const allTeams = await getAllTeams();
  const byLeague = new Map<number, number[]>();
  for (const t of allTeams) {
    const ids = byLeague.get(t.leagueId) ?? [];
    ids.push(t.eaTeamId);
    byLeague.set(t.leagueId, ids);
  }

  const fixtures: FixtureDocument[] = [];
  for (const [leagueId, teamIds] of byLeague) {
    const schedule = generateRoundRobin(teamIds);
    for (const f of schedule) {
      fixtures.push({
        careerId,
        leagueId,
        seasonNumber,
        matchday: f.matchday,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        isUserMatch: f.homeTeamId === clubTeamId || f.awayTeamId === clubTeamId,
        played: false,
        homeGoals: null,
        awayGoals: null,
        playedAt: null,
      });
    }
  }
  if (fixtures.length) await getFixturesCollection().insertMany(fixtures);
}

export async function getFixturesForMatchday(careerId: string, seasonNumber: number, matchday: number): Promise<FixtureDocument[]> {
  return getFixturesCollection().find({ careerId, seasonNumber, matchday }).toArray();
}

export async function getAllFixtures(careerId: string, seasonNumber: number): Promise<FixtureDocument[]> {
  return getFixturesCollection().find({ careerId, seasonNumber }).sort({ matchday: 1 }).toArray();
}

export async function getMaxMatchday(careerId: string, seasonNumber: number): Promise<number> {
  const last = await getFixturesCollection().find({ careerId, seasonNumber }).sort({ matchday: -1 }).limit(1).next();
  return last?.matchday ?? 0;
}

export type FixtureResultUpdate = {
  readonly homeTeamId: number;
  readonly awayTeamId: number;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly scorers: readonly { readonly teamId: number; readonly playerId: number; readonly playerName: string }[];
};

// Persists results + scorers for a whole matchday, then advances the career pointer.
export async function recordMatchdayResults(careerId: string, seasonNumber: number, matchday: number, results: readonly FixtureResultUpdate[]): Promise<void> {
  const now = new Date();
  await Promise.all(
    results.map((r) =>
      getFixturesCollection().updateOne(
        { careerId, seasonNumber, matchday, homeTeamId: r.homeTeamId, awayTeamId: r.awayTeamId },
        { $set: { played: true, homeGoals: r.homeGoals, awayGoals: r.awayGoals, playedAt: now } },
      ),
    ),
  );

  const scorerDocs: GoalScorerDocument[] = results.flatMap((r) =>
    r.scorers.map((s) => ({ careerId, seasonNumber, matchday, teamId: s.teamId, playerId: s.playerId, playerName: s.playerName })),
  );
  if (scorerDocs.length) await getScorersCollection().insertMany(scorerDocs);

  await getCareersCollection().updateOne({ _id: careerId }, { $set: { currentMatchday: matchday + 1 } });
}

// Aggregates the golden-boot race for a season: (playerId → goals), sorted desc.
export async function aggregateTopScorers(careerId: string, seasonNumber: number): Promise<readonly { readonly playerId: number; readonly playerName: string; readonly teamId: number; readonly goals: number }[]> {
  return getScorersCollection()
    .aggregate<{ readonly playerId: number; readonly playerName: string; readonly teamId: number; readonly goals: number }>([
      { $match: { careerId, seasonNumber } },
      { $group: { _id: '$playerId', playerId: { $first: '$playerId' }, playerName: { $first: '$playerName' }, teamId: { $first: '$teamId' }, goals: { $sum: 1 } } },
      { $sort: { goals: -1, playerName: 1 } },
      { $project: { _id: 0 } },
    ])
    .toArray();
}

// Season rollover: archives the finished season, bumps the season number,
// regenerates a fresh schedule, and resets the matchday pointer.
export async function startNewSeason(career: CareerDocument, archive: SeasonArchiveDocument): Promise<CareerDocument> {
  const nextSeason = career.seasonNumber + 1;

  await getSeasonArchivesCollection().replaceOne({ careerId: career._id, seasonNumber: career.seasonNumber }, archive, { upsert: true });

  // Drop the finished season's fixtures + scorers to keep the working set small.
  await Promise.all([
    getFixturesCollection().deleteMany({ careerId: career._id, seasonNumber: career.seasonNumber }),
    getScorersCollection().deleteMany({ careerId: career._id, seasonNumber: career.seasonNumber }),
  ]);

  await getCareersCollection().updateOne({ _id: career._id }, { $set: { seasonNumber: nextSeason, currentMatchday: 1 } });
  await generateSeasonFixtures(career._id, career.clubTeamId, nextSeason);

  return { ...career, seasonNumber: nextSeason, currentMatchday: 1 };
}

export async function getLatestSeasonArchive(careerId: string): Promise<SeasonArchiveDocument | null> {
  return getSeasonArchivesCollection().find({ careerId }).sort({ seasonNumber: -1 }).limit(1).next();
}
