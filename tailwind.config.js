/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'switch-bg': '#edf4ed',
        'switch-primary': '#a5c869',
        'switch-secondary': '#2f3f28',
        'switch-secondary-dark': '#1a2416',
        'switch-tertiary': '#d2beff',
      },
      fontFamily: {
        'dm': ['DM Sans', 'sans-serif'],
        'playfair': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
