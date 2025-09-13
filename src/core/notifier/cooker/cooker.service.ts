import { Injectable } from '@nestjs/common';
import { getRecipe, getRecipes } from './mongo';
import { RecipesCacheService } from './recipes-cache.service';
import { Recipe } from './types';

@Injectable()
export class CookerService {
  constructor(private readonly cache: RecipesCacheService) {}

  async getRecipes(chatId: number): Promise<Recipe[]> {
    let recipes = this.cache.getRecipes();
    if (!recipes?.length) {
      recipes = (await getRecipes(chatId)) || [];
      this.cache.saveRecipes(recipes);
    }
    return recipes;
  }

  async getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
    let recipe = this.cache.getRecipe(recipeId);
    if (!recipe) {
      recipe = (await getRecipe(chatId, recipeId)) || null;
    }
    return recipe;
  }
}
