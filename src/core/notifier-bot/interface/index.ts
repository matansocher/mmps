import { UserModel } from '@core/mongo/shared';

export interface NotifyOptions {
  readonly [key: string]: any;
  readonly action: string;
  readonly plainText?: string;
}

export type UserDetails = Pick<UserModel, 'chatId' | 'firstName' | 'lastName' | 'username'>;
