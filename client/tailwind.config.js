/** @type {import('tailwindcss').Config} */
// Брэндийн өнгөнүүд src/index.css дахь CSS хувьсагчаас уншина —
// өнгө солихдоо зөвхөн тэнд өөрчлөхөд хангалттай.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: v('blue'),
          royal: v('royal'),
          navy: v('navy'),
          sky: v('sky'),
          mist: v('mist'),
          yellow: v('yellow'),
          coral: v('coral'),
          mint: v('mint'),
        },
        ink: { DEFAULT: v('ink'), soft: v('ink-soft') },
        line: v('line'),
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
        hand: ['Caveat', 'Segoe Print', 'cursive'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 18px 40px -18px rgb(10 40 120 / .35)',
        glow: '0 20px 50px -15px rgb(var(--c-blue) / .55)',
        btn: '0 8px 0 -3px rgb(var(--c-yellow-dark)), 0 18px 30px -12px rgb(0 0 0 / .35)',
      },
      maxWidth: { wrap: '1180px' },
    },
  },
  plugins: [],
};
