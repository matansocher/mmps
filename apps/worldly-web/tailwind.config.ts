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
          ok: '#00E676',
          bad: '#FF3B3B',
          warn: '#FFD600',
          brand: '#3B82F6',
        },
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
