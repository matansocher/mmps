import { Collection, Db, InsertOneResult, type ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { AnswerModel } from '@core/mongo/quizzy-mongo/models/question.model';
import { QuestionModel } from '../models';
import { COLLECTIONS, CONNECTION_NAME } from '../quizzy-mongo.config';

@Injectable()
export class QuizzyMongoQuestionService {
  private readonly questionCollection: Collection<QuestionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.questionCollection = this.db.collection(COLLECTIONS.QUESTION);
  }

  getActiveQuestions(): Promise<QuestionModel[]> {
    const filter = { isActive: true };
    return this.questionCollection.find(filter).toArray();
  }

  getQuestion(chatId: number): Promise<QuestionModel> {
    const filter = { chatId };
    return this.questionCollection.findOne(filter);
  }

  // export interface AnswerModel {
  //   readonly id: string;
  //   readonly text: string;
  //   readonly isCorrect: boolean;
  // }
  //
  // export interface QuestionModel {
  //   readonly _id: ObjectId;
  //   readonly question: string;
  //   readonly answers: AnswerModel[];
  //   readonly createdAt: Date;
  // }

  saveQuestion(question: string, answers: AnswerModel[]): Promise<InsertOneResult<QuestionModel>> {
    const questionModel = {
      question,
      answers,
      createdAt: new Date(),
    } as QuestionModel;
    return this.questionCollection.insertOne(questionModel);
  }

  async updateQuestion(chatId: number, toUpdate: Partial<QuestionModel>): Promise<void> {
    const filter = { chatId };
    const updateObj = { $set: { ...toUpdate } };
    await this.questionCollection.updateOne(filter, updateObj);
  }
}
