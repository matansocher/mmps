import { generateRecipeString, getRecipe } from '@shared/cooker';

export async function getRecipeItem(chatId: number, recipeId: string): Promise<string> {
  if (!recipeId) {
    return 'Error: recipeId is required when action is get_recipe';
  }

  const recipe = await getRecipe(chatId, recipeId);

  if (!recipe) {
    return `Recipe with ID ${recipeId} not found`;
  }

  return generateRecipeString(recipe);
}
