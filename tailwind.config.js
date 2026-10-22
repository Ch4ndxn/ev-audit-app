/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0f4c9e',
          lt: '#1a6be8',
          bg: '#e8f0fe',
        },
      },
    },
  },
  plugins: [],
};
