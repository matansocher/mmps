// Lightweight haptic feedback (no-op where unsupported, e.g. desktop / iOS Safari).
type Pattern = 'light' | 'success' | 'error' | 'heavy';

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 10,
  success: [12, 40, 18],
  error: [30, 40, 30],
  heavy: 24,
};

export function haptic(pattern: Pattern): void {
  try {
    navigator.vibrate?.(PATTERNS[pattern]);
  } catch {
    /* unsupported */
  }
}
