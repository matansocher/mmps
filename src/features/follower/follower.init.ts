import { createMongoConnection } from '@core/mongo';
import { createIndexes, DB_NAME } from '@shared/follower';
import { FollowerSchedulerService } from './follower-scheduler.service';
import { FollowerController } from './follower.controller';

export async function initFollower(): Promise<void> {
  await createMongoConnection(DB_NAME);

  await createIndexes();

  const followerController = new FollowerController();
  const followerScheduler = new FollowerSchedulerService();

  followerController.init();
  followerScheduler.init();
}
