import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0b',
          panel: '#111114',
          elev: '#17171c',
          line: '#22222a',
        },
        accent: {
          DEFAULT: '#7c5cff',
          glow: '#a48bff',
        },
        ink: {
          DEFAULT: '#e6e6ea',
          muted: '#8a8a96',
          dim: '#5a5a66',
        },
        ok: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
