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

    const courseCollection = client.db('Teacher').collection('Course');
    const courseParticipationCollection = client.db('Teacher').collection('CourseParticipation');

    const courses = await courseCollection.find().toArray();
    for (const course of courses) {
      try {
        if (course.status !== 'pending') {
          const courseParticipation = {
            _id: new ObjectId(),
            courseId: course._id.toString(),
            chatId: 862305226,
            threadId: course.threadId,
            status: 'completed',
            assignedAt: course.assignedAt,
            completedAt: course.completedAt,
            createdAt: course.createdAt,
          };
          await courseParticipationCollection.insertOne(courseParticipation);
        }
        await courseCollection.updateOne({ _id: new ObjectId(course._id.toString()) }, { $unset: { status: 1, threadId: 1, lessonsCompleted: 1, assignedAt: 1, completedAt: 1 } });
      } catch (err) {
        console.error(`failed processing course ${course._id.toString()}`);
      }

      console.log(`finished processing course ${course._id.toString()}`);
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
