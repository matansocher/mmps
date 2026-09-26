export type Ingredient = 'vegetables' | 'grain' | 'chicken' | 'fish' | 'beef' | 'dairy' | 'fruit';
export type ViewId = 'dining' | 'blue' | 'red';
export type Mode = 'career' | 'arcade';
export type Dish = {
  readonly id: number;
  readonly recipeId: number;
  readonly loaded: readonly Ingredient[];
  readonly state: 'raw' | 'cooking' | 'ready' | 'plated' | 'burnt';
  readonly elapsed: number;
  readonly quality: number;
};
export type Order = {
  readonly id: number;
  readonly tableId: number;
  readonly kitchen: 'blue' | 'red';
  readonly dishes: readonly Dish[];
};
export type Table = {
  readonly id: number;
  readonly stage: 'empty' | 'reading' | 'order' | 'waiting' | 'eating' | 'clear';
  readonly guests: number;
  readonly appearance: number;
  readonly patience: number;
  readonly elapsed: number;
  readonly course: number;
};
export type WaiterTask = { readonly target: number; readonly action: 'seat' | 'order' | 'serve' | 'clear' };
export type Feedback = {
  readonly id: number;
  readonly kind: 'info' | 'good' | 'warning' | 'bad';
  readonly text: string;
  readonly cue: 'click' | 'ready' | 'serve' | 'burn' | 'arrival' | 'success' | 'failure';
};
export type Run = {
  readonly version: 1;
  readonly id: string;
  readonly mode: Mode;
  readonly day: number;
  readonly random: number;
  readonly tick: number;
  readonly status: 'running' | 'paused' | 'won' | 'lost';
  readonly view: ViewId;
  readonly anger: number;
  readonly completed: number;
  readonly served: number;
  readonly qualityTotal: number;
  readonly arrivals: number;
  readonly waiting: number;
  readonly waitingPatience: number;
  readonly nextArrival: number;
  readonly tables: readonly Table[];
  readonly orders: readonly Order[];
  readonly selectedOrder: number | null;
  readonly bowls: Readonly<Record<Ingredient, boolean>>;
  readonly prepQueue: readonly Ingredient[];
  readonly prepElapsed: number;
  readonly waiterQueue: readonly WaiterTask[];
  readonly waiterElapsed: number;
  readonly waiterTable: number;
  readonly nextId: number;
  readonly tutorial: number;
  readonly feedback: Feedback;
};
export type Command =
  | { readonly type: 'view'; readonly view: ViewId }
  | { readonly type: 'select'; readonly id: number }
  | { readonly type: 'prep'; readonly ingredient: Ingredient }
  | { readonly type: 'add'; readonly dishId: number; readonly ingredient: Ingredient }
  | { readonly type: 'plate' | 'discard'; readonly dishId: number }
  | { readonly type: 'table'; readonly id: number }
  | { readonly type: 'seat' | 'pause' | 'resume' | 'tutorial-next' | 'tutorial-skip' };
export type Recipe = {
  readonly id: number;
  readonly name: string;
  readonly ingredients: readonly Ingredient[];
  readonly seconds: number;
  readonly oven: boolean;
  readonly description: string;
};
export type Day = {
  readonly id: number;
  readonly name: string;
  readonly parties: number;
  readonly courses: number;
  readonly tables: number;
  readonly groupSize: number;
  readonly arrivalEvery: number;
  readonly patience: number;
  readonly challenge: boolean;
  readonly recipeLimit: number;
};
export type Profile = {
  readonly schemaVersion: 1;
  readonly stars: Readonly<Record<string, number>>;
  readonly unlockedDay: number;
  readonly arcadeBest: number;
  readonly tutorialDone: boolean;
  readonly activeRun: Run | null;
  readonly completedRunIds: readonly string[];
};
export type Save = { readonly revision: number; readonly profile: Profile; readonly updatedAt: string | null };
