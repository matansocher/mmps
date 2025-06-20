import { Injectable } from '@nestjs/common';
import { Recipe } from '@core/mongo/cooker-mongo';
import { BaseCache } from '@core/services';

const validForMinutes = 200;

@Injectable()
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
