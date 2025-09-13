import { ObjectId } from 'mongodb';
import { Recipe } from '../types';
import { getCollection } from './connection';
import { COLLECTIONS } from './constants';

export async function getRecipes(chatId: number): Promise<Recipe[]> {
  const recipeCollection = await getCollection<Recipe>(COLLECTIONS.RECIPE);
  const filter = { chatId };
  return recipeCollection.find(filter).toArray();
}

export async function getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
  const recipeCollection = await getCollection<Recipe>(COLLECTIONS.RECIPE);
  const filter = { chatId, _id: new ObjectId(recipeId) };
  return recipeCollection.findOne(filter);
}
