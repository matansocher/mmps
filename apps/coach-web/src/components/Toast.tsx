import { AnimatePresence, motion } from 'framer-motion';

export type ToastKind = 'success' | 'error';

export type ToastState = { id: number; kind: ToastKind; message: string } | null;

const COLORS: Record<ToastKind, string> = {
  success: 'bg-accent-win/15 border-accent-win/40 text-accent-win',
  error: 'bg-accent-live/15 border-accent-live/40 text-accent-live',
};

const ICONS: Record<ToastKind, string> = {
  success: '✓',
  error: '✕',
};

export function Toast({ state }: { state: ToastState }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key={state.id}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <div className={`px-4 py-2 rounded-full border backdrop-blur ${COLORS[state.kind]} flex items-center gap-2 shadow-lg`}>
            <span className="text-base leading-none">{ICONS[state.kind]}</span>
            <span className="text-sm font-medium whitespace-nowrap">{state.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

