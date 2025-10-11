import { getRecipes } from '@shared/cooker';

export async function getRecipesList(chatId: number): Promise<string> {
  const recipes = await getRecipes(chatId);

  if (!recipes || recipes.length === 0) {
    return 'No recipes found. You can add recipes to your collection first.';
  }

  const recipesList = recipes.map((recipe) => ({
    id: recipe._id.toString(),
    title: recipe.title,
    emoji: recipe.emoji || '🍽️',
    tags: recipe.tags || [],
  }));

  return JSON.stringify({ count: recipesList.length, recipes: recipesList });
}
