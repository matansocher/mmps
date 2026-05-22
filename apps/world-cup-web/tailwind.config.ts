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
          exact: '#00E676',
          gd: '#66BB6A',
          result: '#FFD600',
          wrong: '#FF3B3B',
          live: '#FF3B3B',
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
        },
      },
    },
  },
  plugins: [],
};
export default config;
