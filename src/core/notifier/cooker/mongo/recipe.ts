import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Recipe } from '../types';
import { DB_NAME } from './index';

const getCollection = () => getMongoCollection<Recipe>(DB_NAME, 'Recipe');

export async function getRecipes(chatId: number): Promise<Recipe[]> {
  const recipeCollection = getCollection();
  const filter = { chatId };
  return recipeCollection.find(filter).toArray();
}

export async function getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
  const recipeCollection = getCollection();
  const filter = { chatId, _id: new ObjectId(recipeId) };
  return recipeCollection.findOne(filter);
}
