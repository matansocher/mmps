import { generateOddsImage } from '@services/polymarket';
import { buildPolymarketOddsImage } from '../../tool-images';
import type { ImagePreview } from './types';

const WORLD_CUP = {
  success: true,
  type: 'multi',
  event: { title: '2026 FIFA World Cup Winner', slug: 'world-cup-2026', url: 'https://polymarket.com/event/world-cup-2026' },
  outcomes: [
    { rank: 1, outcome: 'Spain', probability: 0.172, probabilityPercent: '17.2%', oneDayPriceChange: 0.014 },
    { rank: 2, outcome: 'France', probability: 0.148, probabilityPercent: '14.8%', oneDayPriceChange: -0.006 },
    { rank: 3, outcome: 'England', probability: 0.121, probabilityPercent: '12.1%', oneDayPriceChange: 0.002 },
    { rank: 4, outcome: 'Brazil', probability: 0.094, probabilityPercent: '9.4%', oneDayPriceChange: -0.011 },
    { rank: 5, outcome: 'Argentina', probability: 0.088, probabilityPercent: '8.8%', oneDayPriceChange: 0 },
    { rank: 6, outcome: 'Germany', probability: 0.061, probabilityPercent: '6.1%', oneDayPriceChange: null },
  ],
};

const TRENDING = {
  success: true,
  message: 'Top 5 trending markets by 24h volume',
  markets: [
    { rank: 1, question: 'Fed decreases interest rates by 25 bps after December 2025 meeting?', yesPrice: '84.5%', volume24hr: '$12.4M', slug: 'fed', url: '' },
    { rank: 2, question: 'Will Bitcoin reach $150,000 by December 31?', yesPrice: '7.3%', volume24hr: '$5.1M', slug: 'btc', url: '' },
    { rank: 3, question: 'Will Taylor Swift announce a new album in 2025?', yesPrice: '31.0%', volume24hr: '$2.2M', slug: 'ts', url: '' },
    { rank: 4, question: 'US government shutdown before February?', yesPrice: '0.4%', volume24hr: '$1.9M', slug: 'gov', url: '' },
    { rank: 5, question: 'Will OpenAI release GPT-6 this year?', yesPrice: '52.0%', volume24hr: '$1.1M', slug: 'gpt', url: '' },
  ],
};

const FED_EVENT = {
  success: true,
  event: { title: 'Fed decision in December?', slug: 'fed-december', url: '' },
  markets: [
    { rank: 1, question: 'Fed decreases interest rates by 25 bps after December meeting?', yesPrice: 0.845, noPrice: 0.155, volume24hr: 12400000, oneDayPriceChange: 0.032, endDate: '', url: '' },
  ],
};

export const POLYMARKET_PREVIEWS: readonly ImagePreview[] = [
  {
    name: 'polymarket-scheduler-update',
    render: () =>
      generateOddsImage(
        [
          {
            title: 'Will Israel and Saudi Arabia normalize relations in 2025?',
            rows: [
              { label: 'Yes', probability: 0.12, change: -0.035, tone: 'yes' },
              { label: 'No', probability: 0.88, change: 0.035, tone: 'no' },
            ],
          },
          {
            title: '2026 FIFA World Cup Winner',
            rows: WORLD_CUP.outcomes.slice(0, 4).map(({ outcome, probability, oneDayPriceChange }) => ({ label: outcome, probability, change: oneDayPriceChange })),
          },
        ],
        { subtitle: 'Daily update', language: 'en' },
      ),
  },
  { name: 'polymarket-tool-event-multi', render: () => buildPolymarketOddsImage([{ toolName: 'polymarket', data: WORLD_CUP }], 'Here are the latest World Cup odds.') },
  { name: 'polymarket-tool-event-binary', render: () => buildPolymarketOddsImage([{ toolName: 'polymarket', data: FED_EVENT }], 'The market gives a December cut 84.5%.') },
  { name: 'polymarket-tool-trending', render: () => buildPolymarketOddsImage([{ toolName: 'polymarket', data: TRENDING }], 'Top trending markets right now.') },
  { name: 'polymarket-tool-hebrew', render: () => buildPolymarketOddsImage([{ toolName: 'polymarket', data: WORLD_CUP }], 'הנה הסיכויים העדכניים לזכייה במונדיאל.') },
];
