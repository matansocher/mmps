import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { TopicModel } from '../models';

@Injectable()
export class EducatorMongoTopicService {
  private readonly topicCollection: Collection<TopicModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.topicCollection = this.db.collection(COLLECTIONS.TOPIC);
  }

  async createTopic(chatId: number, title: string): Promise<TopicModel> {
    const topic: TopicModel = {
      _id: new ObjectId(),
      title,
      createdBy: chatId,
      createdAt: new Date(),
    };
    await this.topicCollection.insertOne(topic);
    return topic;
  }

  async getRandomTopic(chatId: number, excludedTopics: string[]): Promise<TopicModel | null> {
    const filter = {
      _id: { $nin: excludedTopics.map((topicId) => new ObjectId(topicId)) },
      $or: [
        { createdBy: chatId }, // Topics created by the user
        { createdBy: { $exists: false } }, // Topics without createdBy field
      ],
    };
    const results = await this.topicCollection
      .aggregate<TopicModel>([
        { $match: filter },
        { $sample: { size: 1 } }, // Get a random topic
      ])
      .toArray();
    return results[0] || null;
  }

  getTopic(id: string): Promise<TopicModel> {
    const filter = { _id: new ObjectId(id) };
    return this.topicCollection.findOne(filter);
  }
}
