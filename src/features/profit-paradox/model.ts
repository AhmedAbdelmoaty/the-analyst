export type Month = 'jan' | 'feb';
export type Product = 'premium' | 'basic';
export type Choice = 'A' | 'B' | 'C' | 'D';
export type Question = 'q1' | 'q2' | 'q3';
export type RevenueKey = `${Month}-${Product}`;

// The only financial inputs. Everything displayed in the game is derived from these.
export const SOURCE = {
  jan: { premium: { revenue: 75_000, grossProfit: 28_500 }, basic: { revenue: 25_000, grossProfit: 1_500 } },
  feb: { premium: { revenue: 20_000, grossProfit: 8_000 }, basic: { revenue: 100_000, grossProfit: 7_000 } },
} as const;
export const MONTHS: Month[] = ['jan', 'feb'];
export const PRODUCTS: Product[] = ['premium', 'basic'];
export const REVENUE_KEYS: RevenueKey[] = ['jan-premium', 'jan-basic', 'feb-premium', 'feb-basic'];

export function productMetrics(month: Month, product: Product) {
  const { revenue, grossProfit } = SOURCE[month][product];
  return { revenue, grossProfit, margin: grossProfit / revenue };
}
export function companyMetrics(month: Month) {
  const revenue = PRODUCTS.reduce((sum, product) => sum + SOURCE[month][product].revenue, 0);
  const grossProfit = PRODUCTS.reduce((sum, product) => sum + SOURCE[month][product].grossProfit, 0);
  return { revenue, grossProfit, margin: grossProfit / revenue };
}
export function revenueShare(month: Month, product: Product) {
  return SOURCE[month][product].revenue / companyMetrics(month).revenue;
}
export function weightedMargin(month: Month) {
  return PRODUCTS.reduce((sum, product) => sum + revenueShare(month, product) * productMetrics(month, product).margin, 0);
}
export function change(metric: 'revenue' | 'grossProfit') {
  return (companyMetrics('feb')[metric] - companyMetrics('jan')[metric]) / companyMetrics('jan')[metric];
}

export interface GameState {
  level: 1 | 2 | 3 | 4 | 5;
  q1: Choice | null;
  q2: Choice | null;
  focused: Product | 'total' | null;
  revenueKeys: RevenueKey[];
  q3: Choice | null;
  accepted: boolean;
  month: Month;
  choiceOrder: Record<Question, Choice[]>;
}
const choices: Choice[] = ['A', 'B', 'C', 'D'];
export function shuffledChoices(previous?: Choice[]): Choice[] {
  const order = [...choices];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (previous && order.every((choice, index) => choice === previous[index])) order.push(order.shift()!);
  return order;
}
export const initialState = (previous?: GameState['choiceOrder']): GameState => ({ level: 1, q1: null, q2: null, focused: null, revenueKeys: [], q3: null, accepted: false, month: 'jan', choiceOrder: { q1: shuffledChoices(previous?.q1), q2: shuffledChoices(previous?.q2), q3: shuffledChoices(previous?.q3) } });
export const mixRevealed = (state: GameState) => REVENUE_KEYS.every(key => state.revenueKeys.includes(key));

export type Action =
  | { type: 'q1'; choice: Choice }
  | { type: 'q2'; choice: Choice }
  | { type: 'q3'; choice: Choice }
  | { type: 'focus'; group: Product | 'total' }
  | { type: 'month'; month: Month }
  | { type: 'revenue'; key: RevenueKey }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'replay' };

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'q1': return state.level === 1 && !state.q1 ? { ...state, q1: action.choice } : state;
    case 'q2': return state.level === 2 && !state.q2 ? { ...state, q2: action.choice } : state;
    case 'q3': return state.level === 4 && !state.q3 ? { ...state, q3: action.choice, accepted: action.choice === 'D' } : state;
    case 'focus': return state.level === 2 ? { ...state, focused: action.group } : state;
    case 'month': return state.level === 3 ? { ...state, month: action.month } : state;
    case 'revenue':
      if (state.level !== 3 || mixRevealed(state) || !REVENUE_KEYS.includes(action.key)) return state;
      return { ...state, revenueKeys: state.revenueKeys.includes(action.key) ? state.revenueKeys.filter(key => key !== action.key) : [...state.revenueKeys, action.key] };
    case 'next': {
      const ready = state.level === 1 ? !!state.q1 : state.level === 2 ? !!state.q2 : state.level === 3 ? mixRevealed(state) : state.level === 4 ? !!state.q3 : false;
      return ready ? { ...state, level: (state.level + 1) as GameState['level'] } : state;
    }
    case 'back': return state.level > 1 ? { ...state, level: (state.level - 1) as GameState['level'] } : state;
    case 'replay': return initialState(state.choiceOrder);
  }
}
