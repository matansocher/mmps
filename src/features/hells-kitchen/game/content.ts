import type { Day, Ingredient, Profile, Recipe } from './types';

export const CONTENT_VERSION = 1;
export const INGREDIENTS: readonly Ingredient[] = ['vegetables', 'grain', 'chicken', 'fish', 'beef', 'dairy', 'fruit'];
export const INGREDIENT_LABELS: Record<Ingredient, string> = { vegetables: 'Vegetables', grain: 'Grains', chicken: 'Poultry', fish: 'Seafood', beef: 'Meat', dairy: 'Dairy', fruit: 'Fruit' };
export const INGREDIENT_COLORS: Record<Ingredient, number> = { vegetables: 0x81a444, grain: 0xdaa748, chicken: 0xd0926f, fish: 0x6facbb, beef: 0xb85243, dairy: 0xe2d8a7, fruit: 0xb977ac };

const recipeData: readonly (readonly [string, readonly Ingredient[], number, boolean, string])[] = [
  ['Garden risotto', ['grain', 'vegetables'], 9, false, 'A creamy vegetable risotto finished with fresh herbs.'],
  ['Pan-seared chicken', ['chicken', 'vegetables'], 13, false, 'Golden chicken with seasonal greens and a light pan sauce.'],
  ['Seared salmon', ['fish', 'vegetables'], 9, false, 'Crisp-skinned salmon with a bright vegetable garnish.'],
  ['Vanilla rice pudding', ['grain', 'dairy'], 5, false, 'Silky rice pudding, gently warmed and finished with vanilla.'],
  ['Beef with butter sauce', ['beef', 'dairy'], 13, false, 'Seared beef finished with a rich butter sauce.'],
  ['Berry cream', ['fruit', 'dairy'], 5, false, 'A delicate fruit compote folded into cream.'],
  ['Roast chicken', ['chicken', 'vegetables'], 17, true, 'Oven-roasted poultry with tender seasonal vegetables.'],
  ['Seafood pilaf', ['fish', 'grain'], 13, false, 'Fluffy grains with gently cooked seafood.'],
  ['Mushroom cream', ['vegetables', 'dairy'], 9, false, 'Earthy mushrooms in a smooth cream sauce.'],
  ['Beef and barley', ['beef', 'grain'], 13, false, 'A hearty plate of tender beef and nutty grains.'],
  ['Lemon chicken rice', ['chicken', 'grain'], 9, false, 'Pan-roasted chicken over fragrant rice.'],
  ['Roasted garden tart', ['vegetables', 'grain', 'dairy'], 17, true, 'A crisp pastry tart filled with vegetables and cream.'],
  ['Butter-poached fish', ['fish', 'dairy'], 9, false, 'Seafood gently poached in a buttery sauce.'],
  ['Warm fruit crumble', ['fruit', 'grain'], 13, true, 'Baked seasonal fruit with a crisp golden topping.'],
  ['Chicken supreme', ['chicken', 'dairy', 'vegetables'], 13, false, 'Chicken breast with vegetables and a silky cream reduction.'],
  ['Steak jardinière', ['beef', 'vegetables'], 13, false, 'A carefully seared steak with a colorful garden garnish.'],
  ['Seafood risotto', ['fish', 'grain', 'dairy'], 13, false, 'Creamy risotto enriched with seafood and butter.'],
  ['Pear custard', ['fruit', 'dairy'], 13, true, 'Soft baked pears in a delicate custard.'],
  ['Chicken casserole', ['chicken', 'grain', 'vegetables'], 17, true, 'An oven-baked chicken casserole with grains and greens.'],
  ['Beef Wellington', ['beef', 'grain', 'vegetables'], 17, true, 'Beef wrapped in pastry with a savory mushroom layer.'],
  ['Herb-crusted cod', ['fish', 'grain', 'vegetables'], 13, true, 'Baked cod with an herb crust and seasonal vegetables.'],
  ['Summer fool', ['fruit', 'dairy'], 5, false, 'Seasonal fruit swirled through whipped cream.'],
  ['Chicken velouté', ['chicken', 'dairy'], 9, false, 'A delicate chicken sauce finished with cream.'],
  ['Braised beef', ['beef', 'vegetables', 'dairy'], 17, true, 'Rich braised beef with a smooth vegetable sauce.'],
  ['Saffron seafood', ['fish', 'grain'], 9, false, 'Seafood served with aromatic saffron grains.'],
  ['Fruit mille-feuille', ['fruit', 'grain', 'dairy'], 13, true, 'Layers of crisp pastry, cream and fruit.'],
  ['Spring vegetable gratin', ['vegetables', 'dairy'], 17, true, 'Tender vegetables beneath a golden cream crust.'],
  ['Chicken ballotine', ['chicken', 'vegetables', 'grain'], 17, true, 'A carefully rolled chicken preparation with savory filling.'],
  ['Beef stroganoff', ['beef', 'dairy', 'grain'], 13, false, 'Seared beef in a cream sauce over grains.'],
  ['Caramelized fruit', ['fruit', 'dairy'], 9, false, 'Warm caramelized fruit with a cool cream finish.'],
  ['Seafood fricassée', ['fish', 'vegetables', 'dairy'], 13, false, 'Seafood and vegetables in a light cream sauce.'],
  ['Chef’s roast', ['beef', 'vegetables', 'grain'], 17, true, 'A full roast plate with grains and seasonal vegetables.'],
  ['Chicken forestière', ['chicken', 'vegetables', 'dairy'], 13, false, 'Chicken with mushrooms and a rich cream reduction.'],
  ['Grand fruit soufflé', ['fruit', 'grain', 'dairy'], 17, true, 'An airy baked dessert with a fragrant fruit center.'],
  ['Signature tasting plate', ['beef', 'vegetables', 'dairy'], 13, false, 'The final service: balance, precision and restraint.'],
];

export const RECIPES: readonly Recipe[] = recipeData.map(([name, ingredients, seconds, oven, description], id) => ({ id, name, ingredients, seconds, oven, description }));

// Reconstructed campaign tuning; individual original arrival schedules are unavailable.
const dayData: readonly (readonly [string, number, number, number, number, number, number])[] = [
  ['Your first service', 2, 1, 2, 1, 35, 100],
  ['Finding your rhythm', 3, 1, 2, 2, 32, 95],
  ['Something sweet', 3, 2, 2, 2, 34, 95],
  ['A full dining room', 4, 2, 3, 2, 32, 90],
  ['The dinner rush', 4, 2, 3, 2, 29, 85],
  ['Saturday service', 5, 2, 3, 2, 28, 85],
  ['Sunday best', 5, 2, 3, 2, 28, 85],
  ['Two kitchens, one chef', 4, 1, 3, 2, 27, 85],
  ['A new standard', 4, 2, 3, 2, 27, 85],
  ['Perfect timing', 5, 2, 3, 2, 26, 83],
  ['The long table', 5, 2, 4, 3, 31, 85],
  ['Under pressure', 5, 2, 4, 3, 29, 82],
  ['A busy Saturday', 6, 2, 4, 3, 29, 82],
  ['Service with confidence', 6, 2, 4, 3, 28, 82],
  ['Into the oven', 5, 1, 4, 3, 29, 90],
  ['Three courses', 4, 3, 4, 3, 35, 90],
  ['A delicate balance', 5, 3, 4, 3, 34, 87],
  ['The evening crowd', 5, 3, 4, 3, 32, 85],
  ['No room for error', 5, 3, 4, 3, 31, 85],
  ['Saturday precision', 6, 3, 4, 3, 31, 85],
  ['A week to remember', 6, 3, 4, 3, 30, 85],
  ['Red versus blue', 6, 1, 4, 3, 25, 85],
  ['The chef’s table', 5, 3, 5, 3, 30, 85],
  ['The faster oven', 6, 3, 5, 3, 30, 84],
  ['A higher calling', 6, 3, 5, 3, 29, 84],
  ['The perfect plate', 6, 3, 5, 3, 28, 84],
  ['Saturday fire', 7, 3, 5, 3, 28, 84],
  ['Calm in the storm', 7, 3, 5, 3, 28, 84],
  ['The final kitchen test', 7, 1, 5, 3, 24, 82],
  ['Senior service', 6, 3, 5, 3, 28, 84],
  ['Every second counts', 7, 3, 5, 3, 28, 84],
  ['A dining room to remember', 7, 3, 5, 3, 27, 84],
  ['The last weekend', 7, 3, 5, 3, 27, 84],
  ['Signature service', 8, 3, 5, 3, 27, 84],
  ['Almost there', 8, 3, 5, 3, 26, 84],
  ['Hell’s Kitchen finale', 8, 3, 5, 3, 26, 84],
];
export const DAYS: readonly Day[] = dayData.map(([name, parties, courses, tables, groupSize, arrivalEvery, patience], index) => ({
  id: index + 1,
  name,
  parties,
  courses,
  tables,
  groupSize,
  arrivalEvery,
  patience,
  challenge: [8, 15, 22, 29].includes(index + 1),
  recipeLimit: Math.min(35, Math.max(2, index + 2)),
}));
export function dayFor(day: number): Day {
  const definition = DAYS[day - 1];
  if (!definition) throw new Error('Unknown career day');
  return definition;
}
export function rankFor(stars: number): string {
  if (stars >= 106) return 'Senior Chef';
  if (stars >= 71) return 'Cook';
  if (stars >= 36) return 'Junior Cook';
  if (stars >= 20) return 'Apprentice';
  return 'Dishwasher';
}
export function emptyProfile(): Profile {
  return { schemaVersion: 1, stars: {}, unlockedDay: 1, arcadeBest: 0, tutorialDone: false, activeRun: null, completedRunIds: [] };
}
export const TUTORIAL = [
  'Welcome to Hell’s Kitchen. First, click the reception desk to greet your guests. Your waiter can queue several jobs.',
  'When the blue bell appears, click the table to take its order. Keep an eye on customer patience.',
  'Go to the kitchen. Click an ingredient bowl to prepare it. Ready bowls glow; select one, then click the matching pan.',
  'Add all the required ingredients to start cooking. Start longer dishes first so everything finishes together.',
  'Click a pan as soon as its timer reaches READY to plate it. Food burns on the stove and cools on the pass.',
  'When the whole order is plated, return to the dining room and click its table to serve. Click again after eating to clear. You’re ready!',
] as const;
