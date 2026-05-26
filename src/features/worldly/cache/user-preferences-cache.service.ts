import { BaseCache } from '@core/services';

export type UserPreferences = {
  readonly onFireMode: boolean; // this mode is sending the user a new game immediately after finishing the previous one
};

const validForMinutes = 30;

export class UserPreferencesCacheService extends BaseCache<UserPreferences> {
  constructor() {
    super(validForMinutes, 'worldly:preferences');
  }

  async getUserPreferences(chatId: number): Promise<UserPreferences | null> {
    return this.getFromCache(chatId.toString());
  }

  async saveUserPreferences(chatId: number, data: UserPreferences): Promise<void> {
    await this.saveToCache(chatId.toString(), data);
  }
}

const userPreferencesCacheService = new UserPreferencesCacheService();
export { userPreferencesCacheService };
