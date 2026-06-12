import type { DeleteResult, InsertOneResult, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import type { CreateMeetFriendData, MeetFriend } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<MeetFriend>(DB_NAME, 'MeetFriends');

export async function getAllMeetFriends(): Promise<MeetFriend[]> {
  return getCollection().find({}).sort({ name: 1 }).toArray();
}

export async function addMeetFriend(data: CreateMeetFriendData): Promise<InsertOneResult<MeetFriend>> {
  const meetFriend: Omit<MeetFriend, '_id'> = {
    name: data.name,
    createdAt: new Date(),
  };
  return getCollection().insertOne(meetFriend as MeetFriend);
}

export async function deleteMeetFriendById(id: ObjectId): Promise<DeleteResult> {
  return getCollection().deleteOne({ _id: id });
}

export async function findMeetFriendByName(name: string): Promise<MeetFriend | null> {
  const regex = new RegExp(`^${name.trim()}$`, 'i');
  return getCollection().findOne({ name: regex });
}
