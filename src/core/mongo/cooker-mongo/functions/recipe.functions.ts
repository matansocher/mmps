import { Collection, Db, ObjectId } from 'mongodb';
import { getCollection, getMongoDb } from '@core/mongo/shared/mongo-connection';
import { COLLECTIONS, DB_NAME } from '../cooker-mongo.config';
import { Recipe } from '../models';

let db: Db;
let recipeCollection: Collection<Recipe>;

(async () => {
  db = await getMongoDb(DB_NAME);
  recipeCollection = getCollection<Recipe>(db, COLLECTIONS.RECIPE);
})();

export async function getRecipes(chatId: number): Promise<Recipe[]> {
  const filter = { chatId };
  return recipeCollection.find(filter).toArray();
}

export async function getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
  const filter = { chatId, _id: new ObjectId(recipeId) };
  return recipeCollection.findOne(filter);
}
