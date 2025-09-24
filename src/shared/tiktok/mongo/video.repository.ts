import { InsertOneResult, ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Video } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Video>(DB_NAME, 'Video');

export async function addVideo(videoId: string): Promise<InsertOneResult<Video>> {
  const videoCollection = getCollection();
  const video = {
    _id: new ObjectId(),
    videoId,
    createdAt: new Date(),
  } as Video;
  return videoCollection.insertOne(video);
}

export async function getVideos(): Promise<Video[]> {
  const videoCollection = getCollection();
  return videoCollection.find({}).toArray();
}
