import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label?: string;
};

export function BottomSheet({ open, onClose, children, label }: Props) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            role="dialog"
            aria-label={label}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-bg-card border-t border-border-subtle rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
          >
            <div className="flex justify-center pt-2">
              <div className="w-10 h-1 rounded-full bg-border-subtle" />
            </div>
            <div className="px-4 pt-3 pb-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
