import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0d1117',
          card: '#161b22',
          elevated: '#1c2330',
        },
        border: { subtle: '#2b3441', strong: '#3a4553' },
        text: {
          primary: '#ffffff',
          secondary: '#d7dee7',
          muted: '#8b98a9',
        },
        accent: {
          primary: '#58a6ff',
          success: '#7ee787',
          warning: '#f0883e',
          danger: '#ff7b72',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
