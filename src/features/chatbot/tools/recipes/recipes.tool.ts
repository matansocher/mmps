import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getRecipeItem, getRecipesList } from './utils';

const schema = z.object({
  action: z.enum(['list_recipes', 'get_recipe']).describe('Action to perform: list_recipes to get all recipes, get_recipe to get a specific recipe'),
  recipeId: z.string().optional().describe('Recipe ID (required when action is get_recipe)'),
  chatId: z.number().describe('Chat ID to fetch recipes for'),
});

async function runner({ action, recipeId, chatId }: z.infer<typeof schema>) {
  try {
    if (action === 'list_recipes') {
      return getRecipesList(chatId);
    }

    if (action === 'get_recipe') {
      return getRecipeItem(chatId, recipeId);
    }

    return 'Invalid action specified';
  } catch (error) {
    return `Error fetching recipes: ${error.message}`;
  }
}

export const recipesTool = tool(runner, {
  name: 'recipes',
  description:
    'Get cooking recipes from your personal collection. Use list_recipes to see all available recipes, then use get_recipe with a specific recipe ID to view the full recipe details including ingredients and instructions.',
  schema,
});
