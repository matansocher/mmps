import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

// One-time consolidation of chatbot-only databases into the single `Chatbot` database.
// Run once per environment (staging, then production) by pointing MONGO_DB_URL at that cluster:
//   MONGO_DB_URL="<staging-uri>"   node src/core/mongo/scripts/consolidate-into-chatbot.mjs
//   MONGO_DB_URL="<production-uri>" node src/core/mongo/scripts/consolidate-into-chatbot.mjs
//
// Idempotent: documents are copied with replaceOne upserts keyed on _id, so re-running is safe.
// These databases share generic collection names (Subscription/Watch), so each source
// collection is copied into a uniquely named target collection in `Chatbot`.

// [sourceDb, sourceCollection, targetCollectionInChatbot]
const MOVES = [
  ['SocialFollower', 'Subscription', 'SocialSubscription'],
  ['SocialFollower', 'PendingPost', 'PendingPost'],
  ['SocialFollower', 'DigestDelivery', 'DigestDelivery'],
  ['SpotifyFollower', 'Subscription', 'SpotifySubscription'],
  ['PolymarketFollower', 'Subscription', 'PolymarketSubscription'],
  ['GamePriceWatcher', 'Watch', 'GamePriceWatch'],
  ['HotelWatcher', 'Watch', 'HotelWatch'],
  ['Trainer', 'UserPreferences', 'UserPreferences'],
  ['Trainer', 'Exercise', 'Exercise'],
];

const TARGET_DB = 'Chatbot';

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  if (!env.MONGO_DB_URL) throw new Error('MONGO_DB_URL environment variable is not set');

  const client = new MongoClient(env.MONGO_DB_URL);
  try {
    await client.connect();
    console.log(`Connected to MongoDB. Consolidating into '${TARGET_DB}'.`);
    const target = client.db(TARGET_DB);

    for (const [sourceDb, sourceCollection, targetCollection] of MOVES) {
      const docs = await client.db(sourceDb).collection(sourceCollection).find({}).toArray();
      if (!docs.length) {
        console.log(`skip ${sourceDb}.${sourceCollection} (empty)`);
        continue;
      }
      const ops = docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
      const result = await target.collection(targetCollection).bulkWrite(ops, { ordered: false });
      const written = result.upsertedCount + result.modifiedCount;
      console.log(`${sourceDb}.${sourceCollection} -> ${TARGET_DB}.${targetCollection}: ${written}/${docs.length}`);
    }

    console.log('Consolidation complete.');
  } catch (error) {
    console.error('Error during consolidation:', error);
    process.exitCode = 1;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
