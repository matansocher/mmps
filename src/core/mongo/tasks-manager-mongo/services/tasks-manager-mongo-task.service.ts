import { Collection, Db, InsertOneResult, ObjectId, UpdateResult } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { TaskModel } from '../models/task.model';
import { COLLECTIONS, CONNECTION_NAME } from '../tasks-manager-mongo.config';

@Injectable()
export class TasksManagerMongoTaskService {
  private readonly taskCollection: Collection<TaskModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.taskCollection = this.db.collection(COLLECTIONS.TASK);
  }

  getActiveTasks(chatId: number = null): Promise<TaskModel[]> {
    const filter = { isCompleted: { $ne: true } };
    if (chatId) {
      filter['chatId'] = chatId;
    }
    return this.taskCollection.find(filter).toArray();
  }

  addTask(chatId: number, taskDetails): Promise<InsertOneResult<TaskModel>> {
    const { title, intervalUnits, intervalAmount } = taskDetails;
    const task: TaskModel = {
      _id: new ObjectId(),
      chatId,
      title,
      intervalUnits,
      intervalAmount,
      createdAt: new Date(),
    };
    return this.taskCollection.insertOne(task);
  }

  getTask(chatId: number, taskId: string): Promise<TaskModel> {
    const filter = { chatId, taskId };
    return this.taskCollection.findOne(filter);
  }

  async markTaskCompleted(chatId: number, taskId: string): Promise<UpdateResult<TaskModel>> {
    const filter = { _id: taskId, chatId } as any;
    const updateObj = {
      $set: {
        isCompleted: true,
        completedAt: new Date(),
      },
    };
    return this.taskCollection.updateOne(filter, updateObj);
  }

  updateLastNotifiedAt(chatId: number, taskId: string, date: Date): Promise<UpdateResult<TaskModel>> {
    const filter = { _id: taskId, chatId } as any;
    const updateObj = { $set: { lastNotifiedAt: date } };
    return this.taskCollection.updateOne(filter, updateObj);
  }
}
