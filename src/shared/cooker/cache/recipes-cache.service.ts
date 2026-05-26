import { BaseCache } from '@core/services';
import { Recipe } from '../types';

const validForMinutes = 200;

export class RecipesCacheService extends BaseCache<Recipe[]> {
  private readonly key = 'all';

  constructor() {
    super(validForMinutes, 'cooker:recipes');
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return (await this.getFromCache(this.key)) || [];
  }

  async getARecipe(recipeId: string): Promise<Recipe | null> {
    const recipes = await this.getAllRecipes();
    return recipes.find((recipe) => recipe._id.toString() === recipeId) || null;
  }

  async saveRecipes(data: Recipe[]): Promise<void> {
    await this.saveToCache(this.key, data);
  }
}

const recipesCacheService = new RecipesCacheService();
export { recipesCacheService };
