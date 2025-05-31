import { Collection, Db, ObjectId } from 'mongodb';
import { Inject, Injectable } from '@nestjs/common';
import { COLLECTIONS, CONNECTION_NAME } from '../cooker-mongo.config';
import { RecipeModel } from '../models';

@Injectable()
export class CookerMongoRecipeService {
  private readonly recipeCollection: Collection<RecipeModel>;

  constructor(@Inject(CONNECTION_NAME) private readonly db: Db) {
    this.recipeCollection = this.db.collection(COLLECTIONS.RECIPE);
  }

  getRecipes(chatId: number): Promise<RecipeModel[]> {
    const filter = { chatId };
    return this.recipeCollection.find(filter).toArray();
  }

  getRecipe(chatId: number, recipeId: string): Promise<RecipeModel> {
    const filter = { chatId, _id: new ObjectId(recipeId) };
    return this.recipeCollection.findOne(filter as any);
  }
}
