import { IsraelGeoGameError, IsraelGeoGameService } from './game.service';
import type { GameLocation } from './types';

const locations: readonly GameLocation[] = [
  { panoramaId: 'pano-1', coordinates: { lat: 32.0853, lng: 34.7818 }, locality: 'Tel Aviv' },
  { panoramaId: 'pano-2', coordinates: { lat: 31.7683, lng: 35.2137 }, locality: 'Jerusalem' },
  { panoramaId: 'pano-3', coordinates: { lat: 32.794, lng: 34.9896 }, locality: 'Haifa' },
  { panoramaId: 'pano-4', coordinates: { lat: 31.8044, lng: 34.6553 }, locality: 'Ashdod' },
  { panoramaId: 'pano-5', coordinates: { lat: 31.252, lng: 34.7915 }, locality: 'Beer Sheva' },
];

function createService(): IsraelGeoGameService {
  let locationIndex = 0;
  return new IsraelGeoGameService(async () => {
    const location = locations[locationIndex];
    locationIndex += 1;
    return location ? [location] : [];
  });
}

describe('IsraelGeoGameService', () => {
  it('creates a five-round session after only the first location is ready', async () => {
    let callCount = 0;
    const locationFactory = vi.fn((): Promise<readonly GameLocation[]> => {
      callCount += 1;
      if (callCount === 1) return Promise.resolve([locations[0]]);
      return new Promise(() => {});
    });
    const service = new IsraelGeoGameService(locationFactory);

    const session = await service.createSession();
    expect(session.round).toEqual(1);
    expect(session.totalRounds).toEqual(5);
    expect(session.panoramaId).toEqual('pano-1');
    expect(session).not.toHaveProperty('locations');
    expect(callCount).toEqual(2);
    expect(locationFactory).toHaveBeenNthCalledWith(1, 1, []);
    expect(locationFactory).toHaveBeenNthCalledWith(2, 1, [locations[0]]);
  });

  it('scores guesses and reveals only the next panorama', async () => {
    const service = createService();
    const session = await service.createSession();
    const result = await service.submitGuess(session.sessionId, { round: 1, coordinates: locations[0].coordinates, radiusKm: 25 });

    expect(result.points).toEqual(3_631);
    expect(result.totalScore).toEqual(3_631);
    expect(result.actual).toEqual(locations[0].coordinates);
    expect(result.circleHit).toEqual(true);
    expect(result.circleRadiusKm).toEqual(25);
    expect(result.outsideDistanceMeters).toEqual(0);
    expect(result.nextPanoramaId).toEqual('pano-2');
    expect(result.completed).toEqual(false);
  });

  it('rejects guesses for a round that is not current', async () => {
    const service = createService();
    const session = await service.createSession();

    await expect(service.submitGuess(session.sessionId, { round: 2, coordinates: locations[1].coordinates, radiusKm: 25 })).rejects.toThrowError(new IsraelGeoGameError('invalid_round', 409));
  });

  it('removes the session after the fifth result', async () => {
    const service = createService();
    const session = await service.createSession();
    let finalResult;

    for (let round = 1; round <= 5; round += 1) {
      finalResult = await service.submitGuess(session.sessionId, { round, coordinates: locations[round - 1].coordinates, radiusKm: 1 });
    }

    expect(finalResult?.completed).toEqual(true);
    expect(finalResult?.totalScore).toEqual(25_000);
    await expect(service.submitGuess(session.sessionId, { round: 5, coordinates: locations[4].coordinates, radiusKm: 1 })).rejects.toThrowError(new IsraelGeoGameError('session_not_found', 404));
  });

  it('rejects a session submitted by another Telegram user', async () => {
    const service = createService();
    const session = await service.createSession(123);

    await expect(service.submitGuess(session.sessionId, { round: 1, coordinates: locations[0].coordinates, radiusKm: 25 }, 456)).rejects.toThrowError(new IsraelGeoGameError('session_not_found', 404));
  });

  it('uses the shared fixed locations for a Daily Route session', async () => {
    const progressionRecorder = vi.fn().mockResolvedValue(undefined);
    const service = new IsraelGeoGameService(async () => {
      throw new Error('Daily Route should not generate another location');
    }, progressionRecorder);
    const session = service.createSessionFromLocations(123, 'daily-scored', locations);

    for (let round = 1; round <= 5; round += 1) {
      const result = await service.submitGuess(session.sessionId, { round, coordinates: locations[round - 1].coordinates, radiusKm: 1 }, 123);
      expect(result.nextPanoramaId).toEqual(round < 5 ? locations[round].panoramaId : undefined);
    }

    expect(progressionRecorder).toHaveBeenCalledTimes(5);
    expect(progressionRecorder).toHaveBeenLastCalledWith(123, 'daily-scored', expect.objectContaining({ completed: true }), expect.arrayContaining([expect.objectContaining({ round: 1 })]), undefined);
  });
});
