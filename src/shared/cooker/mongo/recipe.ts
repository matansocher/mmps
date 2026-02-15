import { ObjectId } from 'mongodb';
import { getMongoCollection } from '@core/mongo';
import { Recipe } from '../types';
import { DB_NAME } from './constants';

const getCollection = () => getMongoCollection<Recipe>(DB_NAME, 'Recipe');

export async function getAllRecipes(chatId: number): Promise<Recipe[]> {
  const recipeCollection = getCollection();
  const filter = { chatId };
  return recipeCollection.find(filter).toArray();
}

export async function getARecipe(chatId: number, recipeId: string): Promise<Recipe> {
  const recipeCollection = getCollection();
  const filter = { chatId, _id: new ObjectId(recipeId) };
  return recipeCollection.findOne(filter);
}
