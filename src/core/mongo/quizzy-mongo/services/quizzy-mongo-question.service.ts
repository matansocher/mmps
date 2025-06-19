import { Collection, Db, InsertOneResult, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { QuestionModel } from '../models';
import { AnswerModel, QuestionStatus } from '../models/question.model';
import { COLLECTIONS, CONNECTION_NAME } from '../quizzy-mongo.config';

type QuestionFilterOptions = {
  readonly questionId?: string | null;
  readonly chatId?: number | null;
};

@Injectable()
export class QuizzyMongoQuestionService {
  private readonly questionCollection: Collection<QuestionModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.questionCollection = this.db.collection(COLLECTIONS.QUESTION);
  }

  getQuestion({ questionId, chatId }: QuestionFilterOptions): Promise<QuestionModel> {
    const filter = { status: QuestionStatus.Assigned };
    if (questionId) {
      filter['_id'] = new ObjectId(questionId);
    }
    if (chatId) {
      filter['chatId'] = chatId;
    }
    return this.questionCollection.findOne(filter);
  }

  async updateQuestion({ questionId, chatId }: QuestionFilterOptions, toUpdate: Partial<QuestionModel>): Promise<void> {
    const filter = {};
    if (questionId) {
      filter['_id'] = new ObjectId(questionId);
    }
    if (chatId) {
      filter['chatId'] = chatId;
    }
    const updateObj = { $set: { ...toUpdate } };
    await this.questionCollection.updateOne(filter, updateObj);
  }

  saveQuestion(chatId: number, question: string, answers: AnswerModel[]): Promise<InsertOneResult<QuestionModel>> {
    const questionModel = {
      chatId,
      question,
      answers,
      status: QuestionStatus.Assigned,
      createdAt: new Date(),
    } as QuestionModel;
    return this.questionCollection.insertOne(questionModel);
  }

  async markQuestionsCompleted(chatId: number): Promise<void> {
    const filter = { chatId, status: QuestionStatus.Assigned };
    const updateObj = {
      $set: {
        status: QuestionStatus.Completed,
        answeredAt: new Date(),
      },
    };
    await this.questionCollection.updateMany(filter, updateObj);
  }
}
