import { BaseCache } from '@core/services';
import { Recipe } from '../types';

const validForMinutes = 200;

export class RecipesCacheService extends BaseCache<Recipe[]> {
  private readonly key = 'recipes';

  constructor() {
    super(validForMinutes);
  }

  getRecipes(): Recipe[] | null {
    return this.getFromCache(this.key) || [];
  }

  getRecipe(recipeId: string): Recipe | null {
    return this.getRecipes().find((recipe) => recipe._id.toString() === recipeId);
  }

  saveRecipes(data: Recipe[]): void {
    this.saveToCache(this.key, data);
  }
}

const recipesCacheService = new RecipesCacheService();
export { recipesCacheService };
