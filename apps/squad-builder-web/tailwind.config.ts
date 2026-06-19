import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0E14',
          card: '#141A23',
          elevated: '#1B2330',
        },
        border: { subtle: '#1F2937' },
        text: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          live: '#FF3B3B',
          win: '#00E676',
          draw: '#FFD600',
          loss: '#FF3B3B',
        },
      },
      keyframes: {
        'slot-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'slot-pulse': 'slot-pulse 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
