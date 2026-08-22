import { buildPolymarketUrl } from '@services/polymarket';
import type { MultiOutcomeEventSummary } from '@services/polymarket';

const DRAW_LABEL_PATTERN = /^draw\b/i;

export function cleanOutcomeLabel(outcome: string): string {
  return DRAW_LABEL_PATTERN.test(outcome) ? 'Draw' : outcome;
}

export function formatMatchOdds(event: MultiOutcomeEventSummary): string {
  if (!event.outcomes.length) {
    return '';
  }

  const lines = event.outcomes.map((outcome, index) => {
    const pct = (outcome.probability * 100).toFixed(1);
    return `${index === 0 ? '🟢' : '⚪'} ${cleanOutcomeLabel(outcome.outcome)}: ${pct}%`;
  });

  return [`📊 *Polymarket odds*`, ...lines, `[View market](${buildPolymarketUrl(event.slug)})`].join('\n');
}
