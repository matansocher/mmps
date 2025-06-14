import { Injectable } from '@nestjs/common';
import { BaseCache } from '@core/services';
import { Trivia } from '../types';

const validForMinutes = 200;

type ThreadData = Trivia & {
  readonly threadId?: string;
};

@Injectable()
export class ThreadsCacheService extends BaseCache<ThreadData> {
  constructor() {
    super(validForMinutes);
  }

  getThreadData(chatId: number): ThreadData {
    return this.getFromCache(chatId.toString()) || null;
  }

  saveThreadData(chatId: number, threadId: ThreadData): void {
    this.saveToCache(chatId.toString(), threadId);
  }
}
