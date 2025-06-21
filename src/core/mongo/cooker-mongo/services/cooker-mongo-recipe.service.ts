import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../cooker-mongo.config';
import { Recipe } from '../models';

@Injectable()
export class CookerMongoRecipeService {
  private readonly recipeCollection: Collection<Recipe>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.recipeCollection = this.db.collection(COLLECTIONS.RECIPE);
  }

  getRecipes(chatId: number): Promise<Recipe[]> {
    const filter = { chatId };
    return this.recipeCollection.find(filter).toArray();
  }

  getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
    const filter = { chatId, _id: new ObjectId(recipeId) };
    return this.recipeCollection.findOne(filter);
  }
}
