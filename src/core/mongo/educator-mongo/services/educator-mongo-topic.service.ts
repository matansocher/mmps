import { Collection, Db, InsertOneResult, ObjectId, UpdateResult, WithId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { TopicModel, TopicStatus } from '../models';

@Injectable()
export class EducatorMongoTopicService {
  private readonly topicCollection: Collection<TopicModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.topicCollection = this.db.collection(COLLECTIONS.TOPIC);
  }

  addTopic(title: string): Promise<InsertOneResult<TopicModel>> {
    const topic = {
      _id: new ObjectId(),
      title,
      status: TopicStatus.Pending,
      createdAt: new Date(),
    };
    return this.topicCollection.insertOne(topic);
  }

  getTopic(topicId: string): Promise<TopicModel> {
    const filter = { _id: new ObjectId(topicId) };
    return this.topicCollection.findOne(filter);
  }

  async getRandomTopic(): Promise<WithId<TopicModel> | null> {
    const filter = { status: TopicStatus.Pending };
    const results = await this.topicCollection
      .aggregate<WithId<TopicModel>>([
        { $match: filter },
        { $sample: { size: 1 } }, // Get a random topic
      ])
      .toArray();
    return results[0] || null; // Return the first result or null if none
  }

  getActiveTopic(): Promise<WithId<TopicModel>> {
    const filter = { status: TopicStatus.Assigned };
    return this.topicCollection.findOne(filter) as Promise<WithId<TopicModel>>;
  }

  startTopic(topicId: ObjectId, additionalData: Partial<TopicModel>): Promise<UpdateResult<TopicModel>> {
    const filter = { _id: topicId };
    const updateObj = { $set: { status: TopicStatus.Assigned, assignedAt: new Date(), ...additionalData } };
    return this.topicCollection.updateOne(filter, updateObj);
  }

  async markTopicCompleted(topicId: string): Promise<UpdateResult<TopicModel>> {
    const filter = { _id: new ObjectId(topicId) };
    const updateObj = {
      $set: {
        status: TopicStatus.Completed,
        completedAt: new Date(),
      },
    };
    return this.topicCollection.updateOne(filter, updateObj);
  }
}
