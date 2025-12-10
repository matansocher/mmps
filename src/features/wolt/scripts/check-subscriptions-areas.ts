import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import { Logger } from '@core/utils';
import { DB_NAME, Subscription } from '@shared/wolt';
import { getRestaurantsList } from '../utils';

const logger = new Logger('check-subscriptions-areas');

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    logger.log('Connected to MongoDB.');

    const subscriptionsCollection = client.db(DB_NAME).collection('Subscription');

    const [restaurants, subscriptions] = await Promise.all([getRestaurantsList(), subscriptionsCollection.find().toArray()]);
    const restaurantsCount: Record<string, number> = {};
    const areasCount: Record<string, number> = {};

    for (const subscription of subscriptions as Subscription[]) {
      if (restaurantsCount[subscription.restaurant]) {
        restaurantsCount[subscription.restaurant] += 1;
      } else {
        restaurantsCount[subscription.restaurant] = 1;
      }
    }

    for (const restaurantName in restaurantsCount) {
      const relevantRestaurant = restaurants.find((r) => r.name === restaurantName);
      if (!relevantRestaurant) {
        continue;
      }

      if (areasCount[relevantRestaurant.area]) {
        areasCount[relevantRestaurant.area] += 1;
      } else {
        areasCount[relevantRestaurant.area] = 1;
      }
    }

    // logger.log('restaurantsCount');
    // logger.log(restaurantsCount);
    // logger.log('areasCount');
    // logger.log(areasCount);
  } catch (err) {
    logger.error(`Error during insertion: ${err}`);
  } finally {
    await client.close();
    logger.log('Disconnected from MongoDB.');
  }
}

main().catch((err) => logger.error(err));
