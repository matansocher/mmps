import { Collection, Db, ObjectId, UpdateResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../educator-mongo.config';
import { TopicParticipationModel, TopicParticipationStatus } from '../models';

@Injectable()
export class EducatorMongoTopicParticipationService {
  private readonly topicParticipationCollection: Collection<TopicParticipationModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.topicParticipationCollection = this.db.collection(COLLECTIONS.TOPIC_PARTICIPATION);
  }

  async createTopicParticipation(chatId: number, topicId: string): Promise<TopicParticipationModel> {
    const topicParticipation = {
      _id: new ObjectId(),
      topicId,
      chatId,
      status: TopicParticipationStatus.Pending,
      createdAt: new Date(),
    };
    await this.topicParticipationCollection.insertOne(topicParticipation);
    return topicParticipation;
  }

  getTopicParticipation(topicId: string): Promise<TopicParticipationModel> {
    const filter = { topicId };
    return this.topicParticipationCollection.findOne(filter);
  }

  getTopicParticipations(chatId: number): Promise<TopicParticipationModel[]> {
    const filter = { chatId };
    return this.topicParticipationCollection.find(filter).toArray();
  }

  getActiveTopicParticipation(chatId: number): Promise<TopicParticipationModel> {
    const filter = { chatId, status: TopicParticipationStatus.Assigned };
    return this.topicParticipationCollection.findOne(filter);
  }

  startTopicParticipation(id: ObjectId, additionalData: Partial<TopicParticipationModel>): Promise<UpdateResult<TopicParticipationModel>> {
    const filter = { _id: id };
    const updateObj = { $set: { status: TopicParticipationStatus.Assigned, assignedAt: new Date(), ...additionalData } };
    return this.topicParticipationCollection.updateOne(filter, updateObj);
  }

  async markTopicParticipationCompleted(topicId: string): Promise<UpdateResult<TopicParticipationModel>> {
    const filter = { topicId };
    const updateObj = {
      $set: {
        status: TopicParticipationStatus.Completed,
        completedAt: new Date(),
      },
    };
    return this.topicParticipationCollection.updateOne(filter, updateObj);
  }
}
