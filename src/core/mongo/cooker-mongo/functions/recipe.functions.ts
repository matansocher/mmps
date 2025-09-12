import { ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { COLLECTIONS, DB_NAME } from '../cooker-mongo.config';
import { Recipe } from '../models';

export async function getRecipes(chatId: number): Promise<Recipe[]> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Recipe>(db, COLLECTIONS.RECIPE);

  const filter = { chatId };
  return collection.find(filter).toArray();
}

export async function getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
  const db = await getMongoDb(DB_NAME);
  const collection = getCollection<Recipe>(db, COLLECTIONS.RECIPE);

  const filter = { chatId, _id: new ObjectId(recipeId) };
  return collection.findOne(filter);
}
