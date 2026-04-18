import type { ObjectId } from 'mongodb';

export type AuthUser = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly photoUrl?: string;
  readonly phoneNumber?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export type AuthApp = 'companion' | string;

export type AuthSession = {
  readonly _id?: ObjectId;
  readonly telegramUserId: number;
  readonly app: AuthApp;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
};

export type PendingAuth = {
  readonly _id?: ObjectId;
  readonly state: string;
  readonly codeVerifier: string;
  readonly app: AuthApp;
  readonly createdAt: Date;
  readonly expiresAt: Date;
};

export type TelegramIdTokenPayload = {
  readonly iss: string;
  readonly aud: string;
  readonly sub: string;
  readonly iat: number;
  readonly exp: number;
  readonly id: number;
  readonly name: string;
  readonly preferred_username?: string;
  readonly picture?: string;
  readonly phone_number?: string;
};
