/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#F5F0E8',
        'bg-dark': '#EDE6D8',
        ink: '#2C2C2C',
        browngray: '#6B5B4E',
        sack: '#C4B5A0',
        ochre: '#8B7355',
        bronze: '#5B7553',
        kiln: '#C4753B',
        glaze: '#6B8E8E',
        cinnabar: '#A0522D',
        border: '#D4C9B8',
        card: '#FAF7F0',
        muted: '#A89B8C',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
