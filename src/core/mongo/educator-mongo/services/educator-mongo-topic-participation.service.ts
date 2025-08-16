import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { TopicParticipation, TopicParticipationStatus } from '../models';

@Injectable()
export class EducatorMongoTopicParticipationService {
  private readonly topicParticipationCollection: Collection<TopicParticipation>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.topicParticipationCollection = this.db.collection(COLLECTIONS.TOPIC_PARTICIPATION);
  }

  async createTopicParticipation(chatId: number, topicId: string): Promise<TopicParticipation> {
    const topicParticipation: TopicParticipation = {
      _id: new ObjectId(),
      topicId,
      chatId,
      status: TopicParticipationStatus.Assigned,
      assignedAt: new Date(),
      createdAt: new Date(),
    };
    await this.topicParticipationCollection.insertOne(topicParticipation);
    return topicParticipation;
  }

  getTopicParticipations(chatId: number): Promise<TopicParticipation[]> {
    const filter = { chatId };
    return this.topicParticipationCollection.find(filter).toArray();
  }

  getActiveTopicParticipation(chatId: number): Promise<TopicParticipation> {
    const filter = { chatId, status: TopicParticipationStatus.Assigned };
    return this.topicParticipationCollection.findOne(filter);
  }

  async markTopicParticipationCompleted(topicParticipationId: string): Promise<TopicParticipation | null> {
    const filter = { _id: new ObjectId(topicParticipationId) };
    const updateObj = {
      $set: {
        status: TopicParticipationStatus.Completed,
        completedAt: new Date(),
      },
    };
    return this.topicParticipationCollection.findOneAndUpdate(filter, updateObj, { returnDocument: 'after' });
  }

  async updatePreviousResponseId(topicParticipationId: string, previousResponseId: string): Promise<void> {
    const filter = { _id: new ObjectId(topicParticipationId) };
    const updateObj = {
      $set: {
        previousResponseId,
      },
    };
    await this.topicParticipationCollection.updateOne(filter, updateObj);
  }

  async saveMessageId(topicParticipationId: string, messageId: number): Promise<void> {
    const filter = { _id: new ObjectId(topicParticipationId) };
    const updateObj = { $push: { threadMessages: messageId } };
    await this.topicParticipationCollection.updateOne(filter, updateObj);
  }
}
