import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import { join } from 'node:path';
import { cwd, env } from 'node:process';

async function main(chatId) {
  config({ path: join(cwd(), '.env.serve') });
  const client = new MongoClient(env.MONGO_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB.');
    const topicCollection = client.db('Educator').collection('Topic');
    const topicParticipationCollection = client.db('Educator').collection('TopicParticipation');
    const [allTopics, topicParticipated] = await Promise.all([topicCollection.find({}).toArray(), topicParticipationCollection.find({ chatId }).toArray()]);

    const topicParticipatedIds = topicParticipated.map((t) => t.topicId.toString());
    const unlearnedTopics = allTopics.filter((t) => !topicParticipatedIds.includes(t._id.toString()));
    for (const { title } of unlearnedTopics) {
      console.log(title);
    }
  } catch (error) {
    console.error('Error during insertion:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB.');
  }
}

main(862305226).catch(console.error);
