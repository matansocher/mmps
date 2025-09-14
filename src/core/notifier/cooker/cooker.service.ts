import { Injectable } from '@nestjs/common';
import { recipesCacheService } from './cache';
import { getRecipe, getRecipes } from './mongo';
import { Recipe } from './types';

@Injectable()
export class CookerService {
  async getRecipes(chatId: number): Promise<Recipe[]> {
    let recipes = recipesCacheService.getRecipes();
    if (!recipes?.length) {
      recipes = (await getRecipes(chatId)) || [];
      recipesCacheService.saveRecipes(recipes);
    }
    return recipes;
  }

  async getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
    let recipe = recipesCacheService.getRecipe(recipeId);
    if (!recipe) {
      recipe = (await getRecipe(chatId, recipeId)) || null;
    }
    return recipe;
  }
}
