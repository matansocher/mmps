import { MongoClient } from 'mongodb';
import { SubscriptionModel } from '@core/mongo/wolt-mongo';
import { COLLECTIONS, DB_NAME } from '@core/mongo/wolt-mongo/wolt-mongo.config';
import { getRestaurantsList } from '../utils/get-restaurants-data';

const mongoUri = 'mongodb+srv://wolt_reader:JJzd7SFJ2K4eXj3@playgrounds.rrd09yy.mongodb.net/';

async function main() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const subscriptionsCollection = client.db(DB_NAME).collection(COLLECTIONS.SUBSCRIPTION);

    const [restaurants, subscriptions] = await Promise.all([getRestaurantsList(), subscriptionsCollection.find().toArray()]);
    const restaurantsCount: Record<string, number> = {};
    const areasCount: Record<string, number> = {};

    for (const subscription of subscriptions as SubscriptionModel[]) {
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

    console.log('restaurantsCount');
    console.log(restaurantsCount);
    console.log('areasCount');
    console.log(areasCount);
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
