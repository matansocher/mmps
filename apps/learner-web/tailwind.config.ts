import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg: {
          base: '#0a0c11',
          card: '#12151d',
          elevated: '#191d27',
        },
        border: { subtle: '#232935', strong: '#333c4b' },
        text: {
          primary: '#f3f5fa',
          secondary: '#c3cad6',
          muted: '#828d9e',
        },
        accent: {
          primary: '#7c8cff',
          success: '#5ee88a',
          warning: '#f0a545',
          danger: '#ff7b72',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,140,255,0.35), 0 8px 30px -8px rgba(124,140,255,0.45)',
        'glow-success': '0 0 0 1px rgba(94,232,138,0.3), 0 8px 30px -10px rgba(94,232,138,0.4)',
        card: '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px -16px rgba(0,0,0,0.7)',
        lift: '0 1px 2px rgba(0,0,0,0.4), 0 14px 40px -18px rgba(0,0,0,0.85)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '60%': { opacity: '1', transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(18px, -14px)' },
        },
        'sheen': {
          '0%': { backgroundPosition: '-120% 0' },
          '100%': { backgroundPosition: '220% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 260ms cubic-bezier(0.16,1,0.3,1)',
        'slide-up': 'slide-up 280ms cubic-bezier(0.16,1,0.3,1)',
        'pop-in': 'pop-in 320ms cubic-bezier(0.16,1,0.3,1)',
        float: 'float 14s ease-in-out infinite',
        sheen: 'sheen 2.4s ease-in-out',
      },
    },
  },
  plugins: [],
};
export default config;
