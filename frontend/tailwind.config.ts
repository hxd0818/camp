import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // CAMP brand colors - solid only, no gradients
        camp: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Unit status colors for floor plan
        status: {
          occupied: '#22c55e',   // green
          vacant: '#ef4444',     // red
          expiring: '#f59e0b',   // amber
          reserved: '#a855f7',   // purple
          maintenance: '#6b7280', // gray
        },
      },
      gridTemplateColumns: {
        '13': 'repeat(13, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
