import type { DeleteResult, InsertOneResult, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateFriendData, Friend } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Friend>(DB_NAME, 'Friends');

export async function getAllFriends(): Promise<Friend[]> {
  return getCollection().find({}).sort({ name: 1 }).toArray();
}

export async function addFriend(data: CreateFriendData): Promise<InsertOneResult<Friend>> {
  const friend: Omit<Friend, '_id'> = {
    name: data.name,
    createdAt: new Date(),
  };
  return getCollection().insertOne(friend as Friend);
}

export async function deleteFriendById(id: ObjectId): Promise<DeleteResult> {
  return getCollection().deleteOne({ _id: id });
}

export async function findFriendByName(name: string): Promise<Friend | null> {
  const regex = new RegExp(`^${name.trim()}$`, 'i');
  return getCollection().findOne({ name: regex });
}
