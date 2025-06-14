import { Injectable } from '@nestjs/common';
import { RecipeModel } from '@core/mongo/cooker-mongo';
import { BaseCache } from '@core/services';

const validForMinutes = 200;

@Injectable()
export class RecipesCacheService extends BaseCache<RecipeModel[]> {
  private readonly key = 'recipes';

  constructor() {
    super(validForMinutes);
  }

  getRecipes(): RecipeModel[] | null {
    return this.getFromCache(this.key) || [];
  }

  getRecipe(recipeId: string): RecipeModel | null {
    return this.getRecipes().find((recipe) => recipe._id.toString() === recipeId);
  }

  saveRecipes(data: RecipeModel[]): void {
    this.saveToCache(this.key, data);
  }
}
