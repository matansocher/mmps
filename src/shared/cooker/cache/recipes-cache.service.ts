import { BaseCache } from '@core/services';
import { Recipe } from '../types';

const validForMinutes = 200;

export class RecipesCacheService extends BaseCache<Recipe[]> {
  private readonly key = 'recipes';

  constructor() {
    super(validForMinutes);
  }

  getAllRecipes(): Recipe[] | null {
    return this.getFromCache(this.key) || [];
  }

  getARecipe(recipeId: string): Recipe | null {
    return this.getAllRecipes().find((recipe) => recipe._id.toString() === recipeId);
  }

  saveRecipes(data: Recipe[]): void {
    this.saveToCache(this.key, data);
  }
}

const recipesCacheService = new RecipesCacheService();
export { recipesCacheService };
