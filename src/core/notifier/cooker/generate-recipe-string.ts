import { Recipe } from '@core/notifier/cooker/mongo';

export function generateRecipeString(recipe: Recipe): string {
  const { emoji, title, ingredients, instructions, tags, link } = recipe;
  return [
    // br
    emoji ? `*${emoji} ${title}*` : `*${title}*`,
    'מצרכים:\n' + ingredients.join('\n'),
    instructions,
    link ? `[למתכון המלא](${link})` : null,
    tags.map((tag) => `#${tag}`).join(', '),
  ]
    .filter(Boolean)
    .join('\n\n');
}
