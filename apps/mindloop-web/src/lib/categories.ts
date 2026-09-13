import type { Category, CategoryId } from './types';

export const CATEGORIES: Record<CategoryId, Category> = {
  memory: {
    id: 'memory',
    label: 'Memory',
    from: 'from-teal-500',
    to: 'to-cyan-500',
    accent: '#0d9488',
    soft: '#d3f5ee',
  },
  attention: {
    id: 'attention',
    label: 'Attention',
    from: 'from-sky-400',
    to: 'to-cyan-500',
    accent: '#0ea5e9',
    soft: '#e2f4ff',
  },
  speed: {
    id: 'speed',
    label: 'Speed',
    from: 'from-amber-400',
    to: 'to-orange-500',
    accent: '#f59e0b',
    soft: '#fff1dd',
  },
  'problem-solving': {
    id: 'problem-solving',
    label: 'Problem Solving',
    from: 'from-emerald-400',
    to: 'to-teal-500',
    accent: '#10b981',
    soft: '#dcfced',
  },
  flexibility: {
    id: 'flexibility',
    label: 'Flexibility',
    from: 'from-pink-400',
    to: 'to-rose-500',
    accent: '#ec4899',
    soft: '#ffe6f1',
  },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'memory',
  'attention',
  'speed',
  'problem-solving',
  'flexibility',
];
