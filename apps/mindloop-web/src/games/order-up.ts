export const INGREDIENTS = ['apple', 'pear', 'berry', 'banana', 'mint', 'lemon'] as const;
export type Ingredient = (typeof INGREDIENTS)[number];

export type CustomerOrder = {
  readonly id: string;
  readonly name: string;
  readonly ingredients: readonly Ingredient[];
};

export type OrderUpdate = {
  readonly customerId: string;
  readonly from: Ingredient;
  readonly to: Ingredient;
};

export type OrderWave = {
  readonly index: number;
  readonly orders: readonly CustomerOrder[];
  readonly revealSeconds: number;
  readonly update?: OrderUpdate;
};

export const ORDER_UP_WAVES = 6;
const NAMES = ['Ada', 'Leo', 'Mia'];

export function orderDifficulty(wave: number) {
  const index = Math.max(0, Math.min(ORDER_UP_WAVES - 1, Math.floor(wave)));
  const customers = index < 2 ? 1 : index < 5 ? 2 : 3;
  const length = index === 0 || index === 2 ? 2 : 3;
  return { customers, length, hasUpdate: index >= 4, revealSeconds: 4 + customers * length * 2 };
}

export function createOrderWave(index: number, random: () => number = Math.random): OrderWave {
  const difficulty = orderDifficulty(index);
  const orders = Array.from({ length: difficulty.customers }, (_, customer) => {
    const pool: Ingredient[] = [...INGREDIENTS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return { id: `${index}-${customer}`, name: NAMES[customer], ingredients: pool.slice(0, difficulty.length) };
  });
  const target = orders[Math.floor(random() * orders.length)];
  const replacements = INGREDIENTS.filter((ingredient) => !target.ingredients.includes(ingredient));
  return {
    index,
    orders,
    revealSeconds: difficulty.revealSeconds,
    ...(difficulty.hasUpdate
      ? { update: { customerId: target.id, from: target.ingredients[Math.floor(random() * target.ingredients.length)], to: replacements[Math.floor(random() * replacements.length)] } }
      : {}),
  };
}

export function updatedIngredients(order: CustomerOrder, update?: OrderUpdate): readonly Ingredient[] {
  return update?.customerId === order.id ? order.ingredients.map((ingredient) => (ingredient === update.from ? update.to : ingredient)) : order.ingredients;
}

export function matchesOrder(expected: readonly Ingredient[], draft: readonly Ingredient[]): boolean {
  return expected.length === draft.length && expected.every((ingredient, index) => ingredient === draft[index]);
}

export type OrderUpState = {
  readonly waves: readonly OrderWave[];
  readonly waveIndex: number;
  readonly phase: 'ready' | 'watch' | 'update' | 'serve' | 'between' | 'over';
  readonly remaining: number;
  readonly selectedId: string;
  readonly drafts: Readonly<Record<string, readonly Ingredient[]>>;
  readonly resolved: Readonly<Record<string, 'correct' | 'wrong'>>;
  readonly completed: number;
  readonly attempted: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly score: number;
  readonly feedback: string;
  readonly lastCorrect: boolean;
};

export type OrderUpAction =
  | { readonly type: 'start' }
  | { readonly type: 'tick'; readonly wave: number; readonly remaining: number }
  | { readonly type: 'hide'; readonly wave: number }
  | { readonly type: 'acknowledge'; readonly wave: number }
  | { readonly type: 'next'; readonly wave: number }
  | { readonly type: 'select' | 'undo' | 'clear' | 'serve' | 'skip'; readonly wave: number; readonly customerId: string }
  | { readonly type: 'add'; readonly wave: number; readonly customerId: string; readonly ingredient: Ingredient };

export function createOrderUpState(waves: readonly OrderWave[]): OrderUpState {
  return {
    waves,
    waveIndex: 0,
    phase: 'ready',
    remaining: waves[0].revealSeconds,
    selectedId: waves[0].orders[0].id,
    drafts: {},
    resolved: {},
    completed: 0,
    attempted: 0,
    streak: 0,
    bestStreak: 0,
    score: 0,
    feedback: '',
    lastCorrect: false,
  };
}

export function orderUpReducer(state: OrderUpState, action: OrderUpAction): OrderUpState {
  if (action.type === 'start') return state.phase === 'ready' ? { ...state, phase: 'watch' } : state;
  if (action.wave !== state.waveIndex) return state;
  const wave = state.waves[state.waveIndex];
  if (action.type === 'hide' || action.type === 'tick') {
    if (state.phase !== 'watch') return state;
    if (action.type === 'tick' && action.remaining > 0) {
      return action.remaining === state.remaining ? state : { ...state, remaining: action.remaining };
    }
    return { ...state, remaining: 0, phase: wave.update ? 'update' : 'serve' };
  }
  if (action.type === 'acknowledge') return state.phase === 'update' ? { ...state, phase: 'serve' } : state;
  if (action.type === 'next') {
    if (state.phase !== 'between') return state;
    if (state.waveIndex === state.waves.length - 1) return { ...state, phase: 'over' };
    const next = state.waves[state.waveIndex + 1];
    return { ...state, waveIndex: state.waveIndex + 1, phase: 'watch', remaining: next.revealSeconds, selectedId: next.orders[0].id, drafts: {}, resolved: {}, feedback: '' };
  }
  if (state.phase !== 'serve') return state;
  const order = wave.orders.find((customer) => customer.id === action.customerId);
  if (!order || state.resolved[order.id]) return state;
  if (action.type === 'select') return { ...state, selectedId: order.id };
  if (state.selectedId !== order.id) return state;
  const draft = state.drafts[order.id] ?? [];
  if (action.type === 'add') {
    if (draft.length >= order.ingredients.length) return state;
    return { ...state, drafts: { ...state.drafts, [order.id]: [...draft, action.ingredient] } };
  }
  if (action.type === 'undo' || action.type === 'clear') {
    return { ...state, drafts: { ...state.drafts, [order.id]: action.type === 'clear' ? [] : draft.slice(0, -1) } };
  }
  if (action.type === 'serve' && draft.length !== order.ingredients.length) return state;
  const correct = action.type === 'serve' && matchesOrder(updatedIngredients(order, wave.update), draft);
  const streak = correct ? state.streak + 1 : 0;
  const resolved = { ...state.resolved, [order.id]: correct ? ('correct' as const) : ('wrong' as const) };
  const allResolved = wave.orders.every((customer) => resolved[customer.id]);
  return {
    ...state,
    phase: allResolved ? 'between' : 'serve',
    drafts: { ...state.drafts, [order.id]: [] },
    resolved,
    completed: state.completed + Number(correct),
    attempted: state.attempted + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    score: state.score + (correct ? 100 + Math.min(streak - 1, 5) * 10 : 0),
    feedback: correct ? `${order.name}’s order served!` : `${order.name}’s order lost. Streak reset — keep going.`,
    lastCorrect: correct,
  };
}

export function orderUpResult(state: OrderUpState) {
  return {
    score: state.score,
    stats: [
      { label: 'Orders completed', value: `${state.completed}/${state.attempted}` },
      { label: 'Accuracy', value: `${state.attempted ? Math.round((state.completed / state.attempted) * 100) : 0}%` },
      { label: 'Best service streak', value: String(state.bestStreak) },
    ],
  };
}
