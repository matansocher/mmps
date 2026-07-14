import { randomUUID } from 'node:crypto';
import { Logger } from '@core/utils';
import { ISRAEL_GEO_CONFIG } from './israel-geo.config';
import { createGameLocations } from './location.service';
import { distanceBetween, scoreCircle } from './scoring';
import type { CreateSessionResponse, GameLocation, GameMode, GameSessionState, ProgressionResult, RoundResult, SubmitGuessData } from './types';

export class IsraelGeoGameError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export type LocationFactory = (count: number, excludedLocations: readonly GameLocation[]) => Promise<readonly GameLocation[]>;
export type ProgressionRecorder = (telegramUserId: number, mode: GameMode, result: RoundResult, results: readonly RoundResult[], dailyIsraelDate?: string) => Promise<ProgressionResult | undefined>;

export class IsraelGeoGameService {
  private readonly logger = new Logger(IsraelGeoGameService.name);
  private readonly sessions = new Map<string, GameSessionState>();
  private readonly nextLocationPromises = new Map<string, Promise<GameLocation | null>>();
  private readonly guessesInProgress = new Set<string>();

  constructor(
    private readonly locationFactory: LocationFactory = createGameLocations,
    private readonly progressionRecorder?: ProgressionRecorder,
  ) {}

  async createSession(telegramUserId = 0, mode: GameMode = 'normal'): Promise<CreateSessionResponse> {
    this.removeExpiredSessions();
    this.enforceSessionLimit();

    const [firstLocation] = await this.locationFactory(1, []);
    if (!firstLocation) throw new Error('Could not generate the first Israel Geo location');
    const now = new Date();
    const session: GameSessionState = {
      id: randomUUID(),
      telegramUserId,
      mode,
      currentLocation: firstLocation,
      usedLocations: [firstLocation],
      queuedLocations: [],
      results: [],
      currentRound: 1,
      totalScore: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ISRAEL_GEO_CONFIG.sessionTtlMs),
    };
    this.sessions.set(session.id, session);
    this.prefetchNextLocation(session);
    return {
      sessionId: session.id,
      round: session.currentRound,
      totalRounds: ISRAEL_GEO_CONFIG.totalRounds,
      panoramaId: firstLocation.panoramaId,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  createSessionFromLocations(telegramUserId: number, mode: GameMode, locations: readonly GameLocation[], dailyIsraelDate?: string): CreateSessionResponse {
    this.removeExpiredSessions();
    this.enforceSessionLimit();
    const [firstLocation, ...queuedLocations] = locations;
    if (!firstLocation || locations.length !== ISRAEL_GEO_CONFIG.totalRounds) throw new Error('Daily Route requires exactly five locations');
    const now = new Date();
    const session: GameSessionState = {
      id: randomUUID(),
      telegramUserId,
      mode,
      dailyIsraelDate,
      currentLocation: firstLocation,
      usedLocations: [firstLocation],
      queuedLocations,
      results: [],
      currentRound: 1,
      totalScore: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ISRAEL_GEO_CONFIG.sessionTtlMs),
    };
    this.sessions.set(session.id, session);
    return { sessionId: session.id, round: 1, totalRounds: ISRAEL_GEO_CONFIG.totalRounds, panoramaId: firstLocation.panoramaId, expiresAt: session.expiresAt.toISOString() };
  }

  async submitGuess(sessionId: string, data: SubmitGuessData, telegramUserId = 0): Promise<RoundResult> {
    this.removeExpiredSessions();
    const session = this.sessions.get(sessionId);
    if (!session) throw new IsraelGeoGameError('session_not_found', 404);
    if (session.telegramUserId !== telegramUserId) throw new IsraelGeoGameError('session_not_found', 404);
    if (session.currentRound !== data.round) throw new IsraelGeoGameError('invalid_round', 409);
    if (this.guessesInProgress.has(sessionId)) throw new IsraelGeoGameError('guess_in_progress', 409);

    this.guessesInProgress.add(sessionId);
    try {
      const location = session.currentLocation;
      const distanceMeters = Math.round(distanceBetween(data.coordinates, location.coordinates));
      const circleScore = scoreCircle(distanceMeters, data.radiusKm);
      const points = circleScore.points;
      const completed = data.round === ISRAEL_GEO_CONFIG.totalRounds;
      const totalScore = session.totalScore + points;
      let nextLocation: GameLocation | undefined;
      const baseResult: RoundResult = {
        round: data.round,
        guess: data.coordinates,
        actual: location.coordinates,
        distanceMeters,
        circleRadiusKm: data.radiusKm,
        circleHit: circleScore.circleHit,
        outsideDistanceMeters: circleScore.outsideDistanceMeters,
        points,
        locality: location.locality,
        totalScore,
        completed,
      };
      const results = [...session.results, baseResult];

      if (!completed) {
        nextLocation = await this.getNextLocation(session);
        const nextSession: GameSessionState = {
          ...session,
          currentLocation: nextLocation,
          usedLocations: [...session.usedLocations, nextLocation],
          queuedLocations: session.queuedLocations.slice(1),
          results,
          currentRound: session.currentRound + 1,
          totalScore,
        };
        this.sessions.set(sessionId, nextSession);
        if (nextSession.currentRound < ISRAEL_GEO_CONFIG.totalRounds) this.prefetchNextLocation(nextSession);
      }

      const resultWithNext = { ...baseResult, nextPanoramaId: nextLocation?.panoramaId };
      const progression = this.progressionRecorder ? await this.progressionRecorder(session.telegramUserId, session.mode, resultWithNext, results, session.dailyIsraelDate) : undefined;
      if (completed) this.deleteSession(sessionId);
      return { ...resultWithNext, progression };
    } finally {
      this.guessesInProgress.delete(sessionId);
    }
  }

  private prefetchNextLocation(session: GameSessionState): void {
    if (session.queuedLocations.length > 0) return;
    const promise = this.locationFactory(1, session.usedLocations)
      .then(([location]) => location ?? null)
      .catch((err) => {
        this.logger.warn(`Failed to prefetch round ${session.currentRound + 1} for session ${session.id}: ${err}`);
        return null;
      });
    this.nextLocationPromises.set(session.id, promise);
  }

  private async getNextLocation(session: GameSessionState): Promise<GameLocation> {
    const queued = session.queuedLocations[0];
    if (queued) return queued;
    const prefetched = await this.nextLocationPromises.get(session.id);
    this.nextLocationPromises.delete(session.id);
    if (prefetched) return prefetched;

    const [generated] = await this.locationFactory(1, session.usedLocations);
    if (!generated) throw new Error(`Could not generate Israel Geo round ${session.currentRound + 1}`);
    return generated;
  }

  private removeExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt.getTime() <= now) this.deleteSession(id);
    }
  }

  private enforceSessionLimit(): void {
    if (this.sessions.size < ISRAEL_GEO_CONFIG.maxActiveSessions) return;
    const oldest = [...this.sessions.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    if (oldest) this.deleteSession(oldest.id);
  }

  private deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.nextLocationPromises.delete(sessionId);
    this.guessesInProgress.delete(sessionId);
  }
}
