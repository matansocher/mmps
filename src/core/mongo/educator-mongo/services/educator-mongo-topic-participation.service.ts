import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { TopicParticipationModel, TopicParticipationStatus } from '../models';

@Injectable()
export class EducatorMongoTopicParticipationService {
  private readonly topicParticipationCollection: Collection<TopicParticipationModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.topicParticipationCollection = this.db.collection(COLLECTIONS.TOPIC_PARTICIPATION);
  }

  async createTopicParticipation(chatId: number, topicId: string, threadId: string): Promise<TopicParticipationModel> {
    const topicParticipation: TopicParticipationModel = {
      _id: new ObjectId(),
      topicId,
      chatId,
      threadId,
      status: TopicParticipationStatus.Assigned,
      assignedAt: new Date(),
      createdAt: new Date(),
    };
    await this.topicParticipationCollection.insertOne(topicParticipation);
    return topicParticipation;
  }

  getTopicParticipations(chatId: number): Promise<TopicParticipationModel[]> {
    const filter = { chatId };
    return this.topicParticipationCollection.find(filter).toArray();
  }

  getActiveTopicParticipation(chatId: number): Promise<TopicParticipationModel> {
    const filter = { chatId, status: TopicParticipationStatus.Assigned };
    return this.topicParticipationCollection.findOne(filter);
  }

  async markTopicParticipationCompleted(topicParticipationId: string): Promise<void> {
    const filter = { _id: new ObjectId(topicParticipationId) };
    const updateObj = {
      $set: {
        status: TopicParticipationStatus.Completed,
        completedAt: new Date(),
      },
    };
    await this.topicParticipationCollection.updateOne(filter, updateObj);
  }
}
