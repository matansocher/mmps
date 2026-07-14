import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        geo: {
          night: '#07111F',
          surface: '#102033',
          elevated: '#193049',
          orange: '#F97316',
          blue: '#2563EB',
          cream: '#FFF7ED',
          ink: '#0F172A',
          muted: '#9FB0C3',
          line: '#2A4158',
          success: '#22C55E',
          danger: '#EF4444',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        action: '0 14px 36px rgb(249 115 22 / 30%)',
      },
    },
  },
  plugins: [],
};

export default config;
