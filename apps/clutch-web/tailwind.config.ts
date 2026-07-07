import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        court: {
          base: '#0B0E13',
          card: '#151A22',
          elevated: '#1D2530',
        },
        line: { subtle: '#232C38', strong: '#33404F' },
        ink: {
          primary: '#FFFFFF',
          secondary: '#9AA7B8',
          muted: '#5F6B7C',
        },
        flame: '#F97316',
        hoop: '#3B82F6',
        win: '#22C55E',
        miss: '#EF4444',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.96)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'pop': 'pop 220ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
