import { getIsraelDate } from './date';
import { IsraelGeoGameService } from './game.service';
import { SEARCH_REGIONS } from './israel-geo.config';
import { createLocationForRegion } from './location.service';
import { getDailyRoute, saveDailyRoute } from './mongo';
import type { CreateSessionResponse, DailyRoute, GameLocation } from './types';

export class DailyRouteService {
  private readonly routePromises = new Map<string, Promise<DailyRoute>>();

  constructor(private readonly gameService: IsraelGeoGameService) {}

  async createSession(telegramUserId: number, completedToday: boolean): Promise<CreateSessionResponse & { readonly practice: boolean; readonly israelDate: string }> {
    const israelDate = getIsraelDate();
    const route = await this.getOrCreateRoute(israelDate);
    const practice = completedToday;
    return { ...this.gameService.createSessionFromLocations(telegramUserId, practice ? 'daily-practice' : 'daily-scored', route.locations, israelDate), practice, israelDate };
  }

  private async getOrCreateRoute(israelDate: string): Promise<DailyRoute> {
    const existing = await getDailyRoute(israelDate);
    if (existing) return existing;
    const inProgress = this.routePromises.get(israelDate);
    if (inProgress) return inProgress;
    const promise = this.generateRoute(israelDate).finally(() => this.routePromises.delete(israelDate));
    this.routePromises.set(israelDate, promise);
    return promise;
  }

  private async generateRoute(israelDate: string): Promise<DailyRoute> {
    const day = Number(israelDate.slice(-2));
    const startIndex = ((day - 1) * 5) % SEARCH_REGIONS.length;
    const regions = Array.from({ length: 5 }, (_, offset) => SEARCH_REGIONS[(startIndex + offset) % SEARCH_REGIONS.length]);
    const locations: GameLocation[] = [];
    for (const region of regions) locations.push(await createLocationForRegion(region, locations));
    return saveDailyRoute({ israelDate, locations, createdAt: new Date() });
  }
}
