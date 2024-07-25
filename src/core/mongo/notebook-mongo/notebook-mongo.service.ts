import { LoggerService } from '@core/logger/logger.service';
import * as mongoConfig from '@core/mongo/notebook-mongo/notebook-mongo.config';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { MongoClient, ObjectId } from 'mongodb';
import { isProd } from '@core/config/main.config';
import { UtilsService } from '@services/utils/utils.service';

@Injectable()
export class NotebookMongoService implements OnModuleInit {
  private client: MongoClient = new MongoClient(mongoConfig.MONGO_DB_URL);

  userCollection;
  analyticLogCollection;
  listCollection;
  listItemCollection;

  constructor(
    private readonly logger: LoggerService,
    private readonly utilsService: UtilsService,
  ) {}

  onModuleInit() {
    this.connectToMongo();
  }

  async connectToMongo() {
    try {
      await this.client.connect();
      this.logger.info(this.connectToMongo.name, 'Connected successfully to mongo server');

      const DB = this.client.db(mongoConfig.NOTEBOOK.NAME);
      this.userCollection = DB.collection(mongoConfig.NOTEBOOK.COLLECTIONS.USER);
      this.analyticLogCollection = DB.collection(mongoConfig.NOTEBOOK.COLLECTIONS.ANALYTIC_LOGS);
      this.listCollection = DB.collection(mongoConfig.NOTEBOOK.COLLECTIONS.LIST);
      this.listItemCollection = DB.collection(mongoConfig.NOTEBOOK.COLLECTIONS.LIST_ITEM);
    } catch (err) {
      this.logger.error(this.connectToMongo.name, `Failed to connect to mongo server - error - ${this.utilsService.getErrorMessage(err)}`);
      throw err;
    }
  }

  async saveUserDetails({ telegramUserId, chatId, firstName, lastName, username }) {
    try {
      const existingUser = await this.userCollection.findOne({ telegramUserId });
      if (existingUser) {
        return;
      }
      const user = { telegramUserId, chatId, firstName, lastName, username };
      return this.userCollection.insertOne(user);
    } catch (err) {
      this.logger.error(this.saveUserDetails.name, `err: ${this.utilsService.getErrorMessage(err)}`);
    }
  }

  sendAnalyticLog(eventName, { chatId, data = null }) {
    if (!isProd) {
      return;
    }
    const log = {
      chatId,
      data,
      eventName,
      // message,
      // error,
      createdAt: new Date(),
    };
    return this.analyticLogCollection.insertOne(log);
  }

  async getMultipleResults(cursor) {
    const results = [];
    for await (const doc of cursor) {
      results.push(doc);
    }
    return results;
  }

  getLists(chatId) {
    try {
      const filter = { chatId, isActive: true };
      const cursor = this.listCollection.find(filter);
      return this.getMultipleResults(cursor);
    } catch (err) {
      this.logger.error(this.getLists.name, `err: ${this.utilsService.getErrorMessage(err)}`);
      return [];
    }
  }

  getList(chatId, listId) {
    const filter = { _id: new ObjectId(listId), chatId, isActive: true };
    return this.listCollection.findOne(filter);
  }

  createList(chatId, name) {
    const list = {
      chatId,
      name,
      isActive: true,
      createdAt: new Date(),
    };
    return this.listCollection.insertOne(list);
  }

  updateList(chatId, listId, newName, newPhoto) {
    const filter = { _id: new ObjectId(listId), chatId, isActive: true };
    const updateObj = { $set: {} };
    if (newName) {
      updateObj.$set.name = newName;
    }
    if (newPhoto) {
      updateObj.$set.photo = newPhoto;
    }
    return this.listCollection.updateOne(filter, updateObj);
  }

  removeList(chatId, listId) {
    const filter = { _id: new ObjectId(listId), chatId, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.listCollection.updateOne(filter, updateObj);
  }

  getListItems(chatId, listId) {
    const filter = { chatId, listId, isActive: true };
    const cursor = this.listItemCollection.find(filter);
    return this.getMultipleResults(cursor);
  }

  createListItem(chatId, listId, name) {
    const listItem = {
      chatId,
      listId,
      name,
      isActive: true,
      createdAt: new Date(),
    };
    return this.listItemCollection.insertOne(listItem);
  }

  updateListItem(chatId, listItemId, { name, photo }) {
    const filter = { _id: new ObjectId(listItemId), chatId, isActive: true };
    const updateObj = { $set: {} };
    if (name) {
      updateObj.$set.name = name;
    }
    if (photo) {
      updateObj.$set.photo = photo;
    }
    return this.listItemCollection.updateOne(filter, updateObj);
  }

  removeListItem(chatId, listItemId) {
    const filter = { _id: new ObjectId(listItemId), chatId, isActive: true };
    const updateObj = { $set: { isActive: false } };
    return this.listItemCollection.updateOne(filter, updateObj);
  }
}
