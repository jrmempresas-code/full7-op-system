import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        full7: {
          50:  '#fef9ee',
          100: '#fef0d0',
          200: '#fcdda1',
          300: '#fac267',
          400: '#f79d37',
          500: '#f57d15',
          600: '#e6600b',
          700: '#bf460c',
          800: '#983712',
          900: '#7b2e12',
          950: '#421405',
        },
        brand: {
          primary: '#1a1a2e',
          secondary: '#16213e',
          accent: '#f57d15',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
