import { getMongoCollection } from '@core/mongo';
import { DB_NAME } from './constants';

export type RailOnboardingStatus = 'started' | 'completed' | 'skipped';

type RailUserOnboarding = {
  readonly chatId: number;
  readonly onboardingStatus?: RailOnboardingStatus;
  readonly onboardingUpdatedAt?: Date;
};

const getCollection = () => getMongoCollection<RailUserOnboarding>(DB_NAME, 'User');

export async function getOnboardingStatus(chatId: number): Promise<RailOnboardingStatus | null> {
  const user = await getCollection().findOne({ chatId });
  return user?.onboardingStatus ?? null;
}

export async function setOnboardingStatus(chatId: number, status: RailOnboardingStatus): Promise<void> {
  await getCollection().updateOne({ chatId }, { $set: { onboardingStatus: status, onboardingUpdatedAt: new Date() } });
}
