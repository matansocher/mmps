import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';
import { COLLECTIONS, DB_NAME } from '@core/mongo/wolt-mongo/wolt-mongo.config';

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const subscriptionsCollection = client.db(DB_NAME).collection(COLLECTIONS.SUBSCRIPTION);
    const userCollection = client.db(DB_NAME).collection(COLLECTIONS.USER);

    const topChatIds = await subscriptionsCollection
      .aggregate([
        // br
        { $group: { _id: '$chatId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const topUsers = await Promise.all(
      topChatIds.map(async ({ _id, count }) => {
        const user = await userCollection.findOne({ chatId: _id });
        const userName = user ? `${user.firstName} ${user.lastName} - ${user.username}` : 'Unknown User';
        return { _id, count, user: userName };
      }),
    );

    const topRestaurants = await subscriptionsCollection
      .aggregate([
        // br
        { $group: { _id: '$restaurant', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    console.log('Top 10 Chat IDs by Subscriptions:');
    topUsers.forEach(({ _id, count, user }) => {
      console.log(`user: ${user}, subscriptions: ${count}`);
    });

    console.log('\n\n\n');

    console.log('\nTop 10 Restaurants by Subscriptions:');
    topRestaurants.forEach(({ _id, count }) => {
      console.log(`restaurant: ${_id}, subscriptions: ${count}`);
    });
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
