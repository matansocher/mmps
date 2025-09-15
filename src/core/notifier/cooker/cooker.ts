import { recipesCacheService } from './cache';
import { getAllRecipes, getARecipe } from './mongo';
import { Recipe } from './types';

export async function getRecipes(chatId: number): Promise<Recipe[]> {
  let recipes = recipesCacheService.getAllRecipes();
  if (!recipes?.length) {
    recipes = (await getAllRecipes(chatId)) || [];
    recipesCacheService.saveRecipes(recipes);
  }
  return recipes;
}

export async function getRecipe(chatId: number, recipeId: string): Promise<Recipe> {
  let recipe = recipesCacheService.getARecipe(recipeId);
  if (!recipe) {
    recipe = (await getARecipe(chatId, recipeId)) || null;
  }
  return recipe;
}
