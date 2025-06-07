import { Injectable } from '@nestjs/common';
import { CookerMongoRecipeService, RecipeModel } from '@core/mongo/cooker-mongo';
import { RecipesCacheService } from './cache';

@Injectable()
export class CookerService {
  constructor(
    private readonly cache: RecipesCacheService,
    private readonly recipeDB: CookerMongoRecipeService,
  ) {}

  async getRecipes(chatId: number): Promise<RecipeModel[]> {
    let recipes = this.cache.getRecipes();
    if (!recipes?.length) {
      recipes = (await this.recipeDB.getRecipes(chatId)) || [];
      this.cache.saveRecipes(recipes);
    }
    return recipes;
  }

  async getRecipe(chatId: number, recipeId: string): Promise<RecipeModel> {
    let recipe = this.cache.getRecipe(recipeId);
    if (!recipe) {
      recipe = (await this.recipeDB.getRecipe(chatId, recipeId)) || null;
    }
    return recipe;
  }
}
