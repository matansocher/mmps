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
          online: '#00E676',
          offline: '#64748B',
          brand: '#00C2E8',
          danger: '#FF3B3B',
        },
      },
      keyframes: {
        'online-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'online-pulse': 'online-pulse 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
