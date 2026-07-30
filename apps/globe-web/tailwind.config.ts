import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#05070D',
          panel: 'rgba(13, 19, 31, 0.72)',
          card: 'rgba(20, 28, 44, 0.85)',
        },
        text: {
          primary: '#F5F8FF',
          secondary: '#9CA9C4',
          muted: '#5D6B88',
        },
        accent: {
          brand: '#4EA8FF',
          correct: '#22E38A',
          wrong: '#FF5470',
          hint: '#FFC24B',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(78, 168, 255, 0.35)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
