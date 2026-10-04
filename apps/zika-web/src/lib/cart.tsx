import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { z11, type Z11Variant } from '../content/index.ts';

const STORAGE_KEY = 'zika-redesign-cart';

export type CartLine = { readonly sku: string; readonly qty: number };
export type CartLineView = CartLine & { readonly variant: Z11Variant; readonly lineTotal: number };

type CartApi = {
  readonly lines: readonly CartLineView[];
  readonly count: number;
  readonly subtotal: number;
  readonly isOpen: boolean;
  readonly lastAdded: string | null;
  add: (sku: string, qty?: number) => void;
  setQty: (sku: string, qty: number) => void;
  remove: (sku: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartApi | null>(null);

const variantBySku = new Map<string, Z11Variant>(z11.variants.map((v) => [v.sku, v]));

function readStored(): CartLine[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as CartLine[];
    return raw.filter((l) => variantBySku.has(l.sku) && l.qty > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(readStored);
  const [isOpen, setOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((sku: string, qty = 1) => {
    if (!variantBySku.has(sku) || qty < 1) return;
    setItems((prev) => {
      const found = prev.find((l) => l.sku === sku);
      return found ? prev.map((l) => (l.sku === sku ? { ...l, qty: Math.min(99, l.qty + qty) } : l)) : [...prev, { sku, qty: Math.min(99, qty) }];
    });
    setLastAdded(sku);
    setOpen(true);
  }, []);

  const setQty = useCallback((sku: string, qty: number) => {
    setItems((prev) => (qty < 1 ? prev.filter((l) => l.sku !== sku) : prev.map((l) => (l.sku === sku ? { ...l, qty: Math.min(99, qty) } : l))));
  }, []);

  const remove = useCallback((sku: string) => setItems((prev) => prev.filter((l) => l.sku !== sku)), []);
  const clear = useCallback(() => setItems([]), []);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const api = useMemo<CartApi>(() => {
    const lines = items.map((l) => {
      const variant = variantBySku.get(l.sku)!;
      return { ...l, variant, lineTotal: variant.priceIls * l.qty };
    });
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
      isOpen,
      lastAdded,
      add,
      setQty,
      remove,
      clear,
      open,
      close,
    };
  }, [items, isOpen, lastAdded, add, setQty, remove, clear, open, close]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
