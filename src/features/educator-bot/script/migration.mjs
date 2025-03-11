import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

async function main() {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');

    const topicCollection = client.db('Educator').collection('Topic');
    const topicParticipationCollection = client.db('Educator').collection('TopicParticipation');

    const topics = await topicCollection.find().toArray();
    for (const topic of topics) {
      try {
        if ('status' in topic && topic.status !== 'pending') {
          const topicParticipation = {
            _id: new ObjectId(),
            topicId: topic._id.toString(),
            chatId: 862305226,
            threadId: topic.threadId,
            status: 'completed',
            assignedAt: topic.assignedAt,
            completedAt: topic.completedAt,
            createdAt: topic.createdAt,
          };
          await topicParticipationCollection.insertOne(topicParticipation);
        }
        await topicCollection.updateOne({ _id: topic._id.toString }, { $unset: { status: 1, threadId: 1, assignedAt: 1, completedAt: 1 } });
      } catch (err) {
        console.error(`failed processing topic ${topic._id.toString()}`);
      }

      console.log(`finished processing topic ${topic._id.toString()}`);
    }

    console.log('Migration finished successfully');
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main().catch(console.error);
