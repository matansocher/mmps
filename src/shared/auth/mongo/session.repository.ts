import { getMongoCollection } from '@core/mongo';
import { Logger } from '@core/utils';
import { DB_NAME, COLLECTIONS } from './constants';
import type { AuthApp, AuthSession, PendingAuth } from '../types';

const logger = new Logger('SessionRepository');
const getSessionCollection = () => getMongoCollection<AuthSession>(DB_NAME, COLLECTIONS.SESSIONS);
const getPendingCollection = () => getMongoCollection<PendingAuth>(DB_NAME, COLLECTIONS.PENDING_AUTH);

// --- Pending Auth (PKCE state) ---

export async function savePendingAuth(state: string, codeVerifier: string, app: AuthApp): Promise<void> {
  try {
    const collection = getPendingCollection();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

    await collection.insertOne({ state, codeVerifier, app, createdAt: now, expiresAt });
  } catch (err) {
    logger.error(`savePendingAuth - err: ${err}`);
    throw err;
  }
}

export async function consumePendingAuth(state: string): Promise<PendingAuth | null> {
  try {
    const collection = getPendingCollection();
    const pending = await collection.findOneAndDelete({ state, expiresAt: { $gt: new Date() } });
    return pending;
  } catch (err) {
    logger.error(`consumePendingAuth - err: ${err}`);
    return null;
  }
}

// --- Sessions ---

export async function createSession(telegramUserId: number, token: string, app: AuthApp): Promise<AuthSession> {
  try {
    const collection = getSessionCollection();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const session: Omit<AuthSession, '_id'> = { telegramUserId, app, token, createdAt: now, expiresAt };
    await collection.insertOne(session as AuthSession);

    return session as AuthSession;
  } catch (err) {
    logger.error(`createSession - err: ${err}`);
    throw err;
  }
}

export async function getValidSession(token: string): Promise<AuthSession | null> {
  try {
    const collection = getSessionCollection();
    return collection.findOne({ token, expiresAt: { $gt: new Date() } });
  } catch (err) {
    logger.error(`getValidSession - err: ${err}`);
    return null;
  }
}

export async function deleteSession(token: string): Promise<void> {
  try {
    const collection = getSessionCollection();
    await collection.deleteOne({ token });
  } catch (err) {
    logger.error(`deleteSession - err: ${err}`);
  }
}

export async function deleteUserSessions(telegramUserId: number, app?: AuthApp): Promise<void> {
  try {
    const collection = getSessionCollection();
    const filter: Record<string, any> = { telegramUserId };
    if (app) filter.app = app;
    await collection.deleteMany(filter);
  } catch (err) {
    logger.error(`deleteUserSessions - err: ${err}`);
  }
}
